// Optional compute-only Vulkan runner. Inputs and outputs are raw GPU buffers;
// all combat execution remains in the production WGSL compiled by Naga.
#define _POSIX_C_SOURCE 200809L
#include <vulkan/vulkan.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <time.h>
#define CHECK(expr) do { VkResult r = (expr); if (r != VK_SUCCESS) { fprintf(stderr, "%s: Vulkan %d\n", #expr, r); exit(1); } } while (0)
static void *read_file(const char *path, size_t *size) {
    FILE *f = fopen(path, "rb"); if (!f) { perror(path); exit(1); }
    fseek(f, 0, SEEK_END); long n = ftell(f); rewind(f);
    if (n <= 0) { fprintf(stderr, "Empty input %s\n", path); exit(1); }
    *size = (size_t)n; void *data = malloc(*size);
    if (fread(data, 1, *size, f) != *size) exit(1);
    fclose(f); return data;
}
static void path_for(char *out, size_t size, const char *dir, const char *prefix, int binding) {
    if (snprintf(out, size, "%s/%s%d.bin", dir, prefix, binding) >= (int)size) exit(1);
}
int main(int argc, char **argv) {
    if (argc != 4) { fprintf(stderr, "usage: native-gpu shader.spv manifest first-fixture-dir\n"); return 1; }
    VkApplicationInfo app = {.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO, .pApplicationName = "PVP native compute checks", .apiVersion = VK_API_VERSION_1_1};
    VkInstanceCreateInfo ici = {.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO, .pApplicationInfo = &app};
    VkInstance instance; CHECK(vkCreateInstance(&ici, NULL, &instance));
    uint32_t count = 0; CHECK(vkEnumeratePhysicalDevices(instance, &count, NULL));
    if (!count) { fprintf(stderr, "No Vulkan compute device\n"); return 1; }
    VkPhysicalDevice *devices = calloc(count, sizeof(*devices)); CHECK(vkEnumeratePhysicalDevices(instance, &count, devices));
    VkPhysicalDevice physical = devices[0]; free(devices);
    VkPhysicalDeviceProperties props; vkGetPhysicalDeviceProperties(physical, &props);
    printf("Native compute device: %s (type %u; software results are not hardware throughput)\n", props.deviceName, props.deviceType);
    uint32_t families = 0; vkGetPhysicalDeviceQueueFamilyProperties(physical, &families, NULL);
    VkQueueFamilyProperties *qp = calloc(families, sizeof(*qp)); vkGetPhysicalDeviceQueueFamilyProperties(physical, &families, qp);
    uint32_t family = 0; while (family < families && !(qp[family].queueFlags & VK_QUEUE_COMPUTE_BIT)) family++; free(qp);
    if (family == families) return 1;
    float priority = 1;
    VkDeviceQueueCreateInfo qci = {.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO, .queueFamilyIndex = family, .queueCount = 1, .pQueuePriorities = &priority};
    VkDeviceCreateInfo dci = {.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO, .queueCreateInfoCount = 1, .pQueueCreateInfos = &qci};
    VkDevice device; CHECK(vkCreateDevice(physical, &dci, NULL, &device)); VkQueue queue; vkGetDeviceQueue(device, family, 0, &queue);
    const int bindings[] = {0, 1, 4, 7, 8, 9, 10, 12}; enum {N = 8};
    VkBuffer buffers[N]; VkDeviceMemory memory[N]; void *mapped[N]; size_t sizes[N];
    VkDescriptorSetLayoutBinding lb[N]; VkDescriptorBufferInfo bi[N]; VkWriteDescriptorSet writes[N];
    VkPhysicalDeviceMemoryProperties mp; vkGetPhysicalDeviceMemoryProperties(physical, &mp);
    for (int i = 0; i < N; i++) {
        char path[4096]; path_for(path, sizeof(path), argv[3], "in", bindings[i]);
        void *data = read_file(path, &sizes[i]); free(data);
        VkBufferCreateInfo bci = {.sType = VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO, .size = sizes[i], .usage = (bindings[i] == 8) ? VK_BUFFER_USAGE_UNIFORM_BUFFER_BIT : VK_BUFFER_USAGE_STORAGE_BUFFER_BIT, .sharingMode = VK_SHARING_MODE_EXCLUSIVE};
        CHECK(vkCreateBuffer(device, &bci, NULL, &buffers[i]));
        VkMemoryRequirements req; vkGetBufferMemoryRequirements(device, buffers[i], &req);
        uint32_t mt = 0; while (mt < mp.memoryTypeCount && (!(req.memoryTypeBits & (1u << mt)) || (mp.memoryTypes[mt].propertyFlags & (VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT)) != (VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT))) mt++;
        if (mt == mp.memoryTypeCount) { fprintf(stderr, "No coherent host memory\n"); return 1; }
        VkMemoryAllocateInfo mai = {.sType = VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO, .allocationSize = req.size, .memoryTypeIndex = mt};
        CHECK(vkAllocateMemory(device, &mai, NULL, &memory[i])); CHECK(vkBindBufferMemory(device, buffers[i], memory[i], 0)); CHECK(vkMapMemory(device, memory[i], 0, sizes[i], 0, &mapped[i]));
        VkDescriptorType type = (bindings[i] == 8) ? VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER : VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        lb[i] = (VkDescriptorSetLayoutBinding){.binding = (uint32_t)bindings[i], .descriptorType = type, .descriptorCount = 1, .stageFlags = VK_SHADER_STAGE_COMPUTE_BIT};
        bi[i] = (VkDescriptorBufferInfo){.buffer = buffers[i], .range = sizes[i]};
    }
    VkDescriptorSetLayoutCreateInfo slci = {.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO, .bindingCount = N, .pBindings = lb};
    VkDescriptorSetLayout sl; CHECK(vkCreateDescriptorSetLayout(device, &slci, NULL, &sl));
    VkPipelineLayoutCreateInfo plci = {.sType = VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO, .setLayoutCount = 1, .pSetLayouts = &sl};
    VkPipelineLayout pl; CHECK(vkCreatePipelineLayout(device, &plci, NULL, &pl));
    VkDescriptorPoolSize ps[] = {{VK_DESCRIPTOR_TYPE_STORAGE_BUFFER, 7}, {VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER, 1}};
    VkDescriptorPoolCreateInfo dpci = {.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO, .maxSets = 1, .poolSizeCount = 2, .pPoolSizes = ps};
    VkDescriptorPool pool; CHECK(vkCreateDescriptorPool(device, &dpci, NULL, &pool));
    VkDescriptorSetAllocateInfo dsai = {.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO, .descriptorPool = pool, .descriptorSetCount = 1, .pSetLayouts = &sl};
    VkDescriptorSet set; CHECK(vkAllocateDescriptorSets(device, &dsai, &set));
    for (int i = 0; i < N; i++) writes[i] = (VkWriteDescriptorSet){.sType = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET, .dstSet = set, .dstBinding = (uint32_t)bindings[i], .descriptorCount = 1, .descriptorType = lb[i].descriptorType, .pBufferInfo = &bi[i]};
    vkUpdateDescriptorSets(device, N, writes, 0, NULL);
    size_t shader_size; void *shader_data = read_file(argv[1], &shader_size);
    VkShaderModuleCreateInfo smci = {.sType = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO, .codeSize = shader_size, .pCode = shader_data};
    VkShaderModule module; CHECK(vkCreateShaderModule(device, &smci, NULL, &module)); free(shader_data);
    VkPipeline pipelines[2]; const char *entries[] = {"advance_live", "predict_reference"};
    for (int i = 0; i < 2; i++) {
        VkComputePipelineCreateInfo pci = {.sType = VK_STRUCTURE_TYPE_COMPUTE_PIPELINE_CREATE_INFO, .stage = {.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO, .stage = VK_SHADER_STAGE_COMPUTE_BIT, .module = module, .pName = entries[i]}, .layout = pl};
        CHECK(vkCreateComputePipelines(device, VK_NULL_HANDLE, 1, &pci, NULL, &pipelines[i]));
    }
    VkCommandPoolCreateInfo cpci = {.sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO, .flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT, .queueFamilyIndex = family};
    VkCommandPool cp; CHECK(vkCreateCommandPool(device, &cpci, NULL, &cp));
    VkCommandBufferAllocateInfo cbai = {.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO, .commandPool = cp, .level = VK_COMMAND_BUFFER_LEVEL_PRIMARY, .commandBufferCount = 1};
    VkCommandBuffer cb; CHECK(vkAllocateCommandBuffers(device, &cbai, &cb));
    FILE *manifest = fopen(argv[2], "r"); if (!manifest) return 1;
    char dir[4096]; unsigned mode, until, step; unsigned cases = 0;
    while (fscanf(manifest, "%4095s %u %u %u", dir, &mode, &until, &step) == 4) {
        if (mode > 1 || !step || !until) return 1;
        for (int i = 0; i < N; i++) {
            char path[4200]; path_for(path, sizeof(path), dir, "in", bindings[i]); size_t n;
            void *data = read_file(path, &n); if (n != sizes[i]) { fprintf(stderr, "Layout differs: %s\n", path); return 1; }
            memcpy(mapped[i], data, n); free(data);
        }
        for (unsigned t = step; ; t += step) {
            unsigned commit = t < until ? t : until; ((uint32_t *)mapped[4])[0] = commit;
            CHECK(vkResetCommandBuffer(cb, 0));
            VkCommandBufferBeginInfo begin = {.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO}; CHECK(vkBeginCommandBuffer(cb, &begin));
            vkCmdBindPipeline(cb, VK_PIPELINE_BIND_POINT_COMPUTE, pipelines[mode]);
            vkCmdBindDescriptorSets(cb, VK_PIPELINE_BIND_POINT_COMPUTE, pl, 0, 1, &set, 0, NULL); vkCmdDispatch(cb, 1, 1, 1);
            VkMemoryBarrier barrier = {.sType = VK_STRUCTURE_TYPE_MEMORY_BARRIER, .srcAccessMask = VK_ACCESS_SHADER_WRITE_BIT, .dstAccessMask = VK_ACCESS_HOST_READ_BIT | VK_ACCESS_SHADER_READ_BIT | VK_ACCESS_SHADER_WRITE_BIT};
            vkCmdPipelineBarrier(cb, VK_PIPELINE_STAGE_COMPUTE_SHADER_BIT, VK_PIPELINE_STAGE_HOST_BIT | VK_PIPELINE_STAGE_COMPUTE_SHADER_BIT, 0, 1, &barrier, 0, NULL, 0, NULL);
            CHECK(vkEndCommandBuffer(cb)); VkSubmitInfo submit = {.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO, .commandBufferCount = 1, .pCommandBuffers = &cb};
            CHECK(vkQueueSubmit(queue, 1, &submit, VK_NULL_HANDLE)); CHECK(vkQueueWaitIdle(queue));
            if (commit == until) break;
        }
        for (int i = 0; i < N; i++) {
            char path[4200]; path_for(path, sizeof(path), dir, "out", bindings[i]); FILE *f = fopen(path, "wb"); if (!f) return 1;
            if (fwrite(mapped[i], 1, sizes[i], f) != sizes[i]) return 1;
            fclose(f);
        }
        cases++;
    }
    fclose(manifest); printf("Completed %u native GPU cases\n", cases);
    for (int i = 0; i < 2; i++) vkDestroyPipeline(device, pipelines[i], NULL);
    vkDestroyCommandPool(device, cp, NULL); vkDestroyShaderModule(device, module, NULL);
    vkDestroyDescriptorPool(device, pool, NULL); vkDestroyPipelineLayout(device, pl, NULL); vkDestroyDescriptorSetLayout(device, sl, NULL);
    for (int i = 0; i < N; i++) { vkUnmapMemory(device, memory[i]); vkDestroyBuffer(device, buffers[i], NULL); vkFreeMemory(device, memory[i], NULL); }
    vkDestroyDevice(device, NULL); vkDestroyInstance(instance, NULL); return 0;
}