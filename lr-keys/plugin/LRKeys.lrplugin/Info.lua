--[[
LR Keys plugin manifest.

LrSdkVersion tracks Lightroom Classic 16, the current app. Adobe's separately
published SDK write-up was still 15.3 when this was written; the compat probe
is what reports the APIs this install actually has.

LrSdkMinimumVersion stays at 6.0, where LrDevelopController and LrSocket
shipped. Newer calls (masks, goToRemove) are probed and skipped when missing.
]]

return {
    LrSdkVersion = 16.0,
    LrSdkMinimumVersion = 6.0,
    LrToolkitIdentifier = "com.lrkeys.plugin",
    LrPluginName = "LR Keys",
    LrInitPlugin = "LRKeysInit.lua",
    LrForceInitPlugin = true,
    LrEnablePlugin = "LRKeysInit.lua",
    LrDisablePlugin = "LRKeysShutdown.lua",
    LrShutdownPlugin = "LRKeysShutdown.lua",
    LrShutdownApp = "LRKeysShutdownApp.lua",
    LrLibraryMenuItems = {
        { title = "LR Keys: Connection And Compat", file = "LRKeysStatus.lua" },
    },
    LrExportMenuItems = {
        { title = "LR Keys: Connection And Compat", file = "LRKeysStatus.lua" },
    },
    VERSION = { major = 0, minor = 1, revision = 0, build = "1" },
}
