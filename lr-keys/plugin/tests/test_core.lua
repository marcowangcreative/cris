-- lua5.1 plugin/tests/test_core.lua
local script_dir = arg[0]:match("^(.*)/") or "."
local plugin_dir = script_dir .. "/../LRKeys.lrplugin/"
local repo_dir = script_dir .. "/../../"

local JSON = dofile(plugin_dir .. "LRKeysJSON.lua")
local Core = dofile(plugin_dir .. "LRKeysCore.lua")

local failures = 0
local function check(condition, message)
    if not condition then
        failures = failures + 1
        io.stderr:write("FAIL ", message, "\n")
    end
end

local function read_all(path)
    local handle = assert(io.open(path, "r"))
    local text = handle:read("*a")
    handle:close()
    return text
end

local catalog_text = read_all(plugin_dir .. "develop-parameters.json")
local catalog = assert(JSON.decode(catalog_text))
check(catalog.sdkVersion == "16.0", "sdk version")
check(catalog.sdkMinimumVersion == "6.0", "sdk minimum")
check(string.find(catalog.temperatureNote, "1500", 1, true) ~= nil, "temperature note mentions 1500")
check(string.find(catalog.temperatureNote, "-150", 1, true) ~= nil, "temperature note mentions -150")

local info = read_all(plugin_dir .. "Info.lua")
check(string.find(info, "LrSdkVersion = 16.0", 1, true) ~= nil, "Info.lua targets SDK 16")
check(string.find(info, "LrSdkMinimumVersion = 6.0", 1, true) ~= nil, "Info.lua minimum is 6")

local banned = { "goToHealing", "goToSpotRemoval", "resetBrushing" }
local sources = { "LRKeysCore.lua", "LRKeysInit.lua", "LRKeysJSON.lua", "LRKeysStatus.lua", "LRKeysShutdown.lua", "LRKeysShutdownApp.lua", "Info.lua" }
for _, name in ipairs(sources) do
    local text = read_all(plugin_dir .. name)
    for _, word in ipairs(banned) do
        check(string.find(text, word, 1, true) == nil, name .. " must not reference " .. word)
    end
end
local core_source = read_all(plugin_dir .. "LRKeysCore.lua")
check(string.find(core_source, "1500", 1, true) == nil, "engine must not hardcode 1500")
check(string.find(core_source, "-150", 1, true) == nil, "engine must not hardcode -150")
check(string.find(core_source, "goToMasking", 1, true) ~= nil, "invert path can open masking")
check(string.find(core_source, "goToRemove", 1, true) ~= nil, "remove uses goToRemove")

local function new_api(overrides)
    local values = { Shadows = 10, Exposure = 0, LensProfileEnable = 0, Temperature = 1600 }
    local calls = { set = {}, range = 0, go_to_masking = 0, go_to_remove = 0, invert = 0 }
    local api = {
        calls = calls,
        values = values,
        module_name = function() return "develop" end,
        version_string = function() return "16.0" end,
        tool = function() return "loupe" end,
        selected_mask = function() return nil end,
        has_function = function(name) return name ~= "goToRemove" end,
        get_value = function(sdk)
            if values[sdk] == nil then
                return 0
            end
            return values[sdk]
        end,
        get_range = function(sdk)
            calls.range = calls.range + 1
            if sdk == "Temperature" then
                return 1500, 50000
            end
            return -100, 100
        end,
        set_value = function(sdk, value)
            calls.set[#calls.set + 1] = { sdk = sdk, value = value }
            values[sdk] = value
        end,
        track = function() end,
        invert_mask = function(id)
            calls.invert = calls.invert + 1
            return true
        end,
        go_to_masking = function()
            calls.go_to_masking = calls.go_to_masking + 1
        end,
        go_to_remove = function()
            calls.go_to_remove = calls.go_to_remove + 1
        end,
    }
    for key, value in pairs(overrides or {}) do
        api[key] = value
    end
    return api
end

local function engine(api)
    return Core.new(api or new_api(), catalog)
end

local shadows = engine()
local replies = shadows:push("inc Shadows2012 5\n")
check(replies[1] == "ok inc Shadows2012 5", "shadows reply")
check(shadows.api.values.Shadows == 15, "shadows incremented with live value")

local clamped = engine()
clamped.api.values.Temperature = 1600
clamped:push("inc Temperature -200\n")
check(clamped.api.values.Temperature == 1500, "clamped to live minimum 1500")

local older = engine()
older.api.get_range = function(sdk)
    if sdk == "Temperature" then
        return 2000, 50000
    end
    return -100, 100
end
older.api.values.Temperature = 2100
older:push("dec Temperature 200\n")
check(older.api.values.Temperature == 2000, "older catalog range is whatever getRange returns")

local library = engine()
library.api.module_name = function() return "library" end
local denied = library:push("inc Exposure2012 0.1\n")
check(string.sub(denied[1], 1, 4) == "err ", "library is rejected")
check(library.api.values.Exposure == 0, "library did not write")

local toggled = engine()
local on_reply = toggled:push("toggle EnableProfileCorrections\n")
check(on_reply[1] == "ok toggle EnableProfileCorrections on", "toggle on")
check(toggled.api.values.LensProfileEnable == 1, "profile corrections enabled")
local off_reply = toggled:push("toggle EnableProfileCorrections\n")
check(off_reply[1] == "ok toggle EnableProfileCorrections off", "toggle off")

local straighten = engine()
straighten:push("run AutoStraighten\n")
check(straighten.api.values.PerspectiveUpright == 2, "auto straighten sets upright level")

local mask_api = new_api()
mask_api.tool = function() return "masking" end
mask_api.selected_mask = function() return "mask-1" end
local masked = engine(mask_api)
masked:push("inc Shadows2012 5\n")
check(mask_api.values.local_Shadows == 5, "mask slider uses local_Shadows")

local invert_api = new_api()
invert_api.tool = function()
    if invert_api.calls.go_to_masking > 0 then
        return "masking"
    end
    return "loupe"
end
invert_api.selected_mask = function()
    if invert_api.calls.go_to_masking > 0 then
        return "mask-9"
    end
    return nil
end
local invert = engine(invert_api)
local invert_reply = invert:push("run InvertMask\n")
check(invert_reply[1] == "ok run InvertMask", "invert reply")
check(invert_api.calls.go_to_masking == 1, "invert opens masking with goToMasking")
check(invert_api.calls.invert == 1, "invert calls invertMask")

local remove_api = new_api()
local remove = engine(remove_api)
local remove_reply = remove:push("run GoToRemove\n")
check(string.sub(remove_reply[1], 1, 4) == "err ", "missing goToRemove fails")
check(remove_api.calls.go_to_remove == 0, "probe and run do not invent the call")

local probe_api = new_api()
probe_api.module_name = function() return "develop" end
local probe = engine(probe_api)
probe:set_mapped({ "Temperature", "Shadows2012", "InvertMask", "GoToRemove" })
local report = probe:push("probe\n")
local joined = table.concat(report, "\n")
check(report[1] == "compat begin", "probe begins")
check(report[#report] == "compat end", "probe ends")
check(string.find(joined, "compat version lightroom 16.0", 1, true) ~= nil, "version logged in probe")
check(string.find(joined, "compat version sdk 16.0", 1, true) ~= nil, "sdk logged in probe")
check(string.find(joined, "compat pass parameter Temperature min=1500 max=50000", 1, true) ~= nil, "live temp range")
check(string.find(joined, "compat fail parameter GoToRemove detail=missing goToRemove", 1, true) ~= nil, "missing remove is a fail")
check(string.find(joined, "compat pass function goToMasking", 1, true) ~= nil, "goToMasking exists in the fake")
check(string.find(joined, "compat fail function goToRemove", 1, true) ~= nil, "goToRemove function fails")
check(probe_api.calls.go_to_masking == 0, "probe does not call goToMasking")
check(probe_api.calls.go_to_remove == 0, "probe does not call goToRemove")
check(#probe_api.calls.set == 0, "probe does not set values")

local skipped = engine()
skipped.api.module_name = function() return "library" end
local skip_lines = table.concat(skipped:push("probe\n"), "\n")
check(string.find(skip_lines, "compat skip parameter Shadows2012 detail=not in develop", 1, true) ~= nil, "outside develop is a skip")
check(string.find(skip_lines, "compat pass function getValue", 1, true) ~= nil, "functions are still checked")

local chunks = engine()
local first = chunks:push("inc Expo")
check(#first == 0, "partial line waits")
local second = chunks:push("sure2012 0.1\r\nping 7\n")
check(second[1] == "ok inc Exposure2012 0.1", "split line reassembles")
check(second[2] == "pong 7", "second line in the chunk")
check(chunks.api.values.Exposure == 0.1, "exposure applied")

local examples = read_all(repo_dir .. "testdata/protocol-examples.txt")
local sample_api = new_api()
sample_api.tool = function() return "masking" end
sample_api.selected_mask = function() return "mask-1" end
local sample = engine(sample_api)
for line in string.gmatch(examples, "[^\n]+") do
    local result = sample:push(line .. "\n")
    local reply = result[1] or ""
    local ok_reply = string.sub(reply, 1, 3) == "ok " or string.sub(reply, 1, 5) == "pong "
    check(ok_reply, "protocol example " .. line .. " -> " .. reply)
end

local decoded_key = JSON.decode('{"bindings":[{"parameter":"Shadows2012","kind":"adjust"}]}')
local names = Core.mapped_from_keymap(decoded_key)
check(names[1] == "Shadows2012", "keymap parameter extract")

local json_report = Core.report_json({
    { scope = "parameter", name = "Temperature", status = "pass", detail = "", minimum = 1500, maximum = 50000 },
}, "16.0", "16.0", "2026-11-13T00:00:00Z")
check(string.find(json_report, '"minimum":1500', 1, true) ~= nil, "json report keeps the live minimum")

if failures > 0 then
    io.stderr:write(failures, " lua test(s) failed\n")
    os.exit(1)
end
print("lua tests ok")
