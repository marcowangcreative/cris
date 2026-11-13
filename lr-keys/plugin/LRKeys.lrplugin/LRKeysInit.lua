local LrApplication = import "LrApplication"
local LrApplicationView = import "LrApplicationView"
local LrDevelopController = import "LrDevelopController"
local LrFileUtils = import "LrFileUtils"
local LrFunctionContext = import "LrFunctionContext"
local LrLogger = import "LrLogger"
local LrPathUtils = import "LrPathUtils"
local LrSocket = import "LrSocket"
local LrTasks = import "LrTasks"

local logger = LrLogger("LRKeys")
logger:enable("logfile")

local JSON = dofile(LrPathUtils.child(_PLUGIN.path, "LRKeysJSON.lua"))
local Core = dofile(LrPathUtils.child(_PLUGIN.path, "LRKeysCore.lua"))

local function support_dir()
    local home = LrPathUtils.getStandardFilePath("home")
    if MAC_ENV then
        return LrPathUtils.child(home, "Library/Application Support/LR Keys")
    end
    return LrPathUtils.child(home, "LR Keys")
end

local function read_file(path)
    local handle = io.open(path, "r")
    if handle == nil then
        return nil
    end
    local text = handle:read("*a")
    handle:close()
    return text
end

local function read_port()
    local text = read_file(LrPathUtils.child(support_dir(), "port.txt"))
    local number = tonumber(text or "")
    if number and number > 0 and number < 65536 then
        return number
    end
    return 58421
end

local function load_catalog()
    local path = LrPathUtils.child(_PLUGIN.path, "develop-parameters.json")
    local text = read_file(path)
    if text == nil then
        logger:error("Missing develop-parameters.json")
        return nil
    end
    local decoded, err = JSON.decode(text)
    if decoded == nil then
        logger:error("Could not read develop-parameters.json: " .. tostring(err))
        return nil
    end
    return decoded
end

local function mapped_names()
    local text = read_file(LrPathUtils.child(support_dir(), "keymap.json"))
    if text == nil then
        return nil
    end
    local decoded = JSON.decode(text)
    if type(decoded) ~= "table" then
        return nil
    end
    return Core.mapped_from_keymap(decoded)
end

local function version_string()
    local ok, value = pcall(function()
        return LrApplication.versionString()
    end)
    if ok and value then
        return tostring(value)
    end
    return "unknown"
end

local function make_api()
    return {
        version_string = version_string,
        module_name = function()
            local ok, name = pcall(LrApplicationView.getCurrentModuleName)
            if ok then
                return name
            end
            return nil
        end,
        tool = function()
            local ok, tool = pcall(LrDevelopController.getSelectedTool)
            if ok then
                return tool
            end
            return nil
        end,
        selected_mask = function()
            if type(LrDevelopController.getSelectedMask) ~= "function" then
                return nil
            end
            local ok, id = pcall(LrDevelopController.getSelectedMask)
            if ok then
                return id
            end
            return nil
        end,
        has_function = function(name)
            return type(LrDevelopController[name]) == "function"
        end,
        get_value = function(sdk)
            return LrDevelopController.getValue(sdk)
        end,
        get_range = function(sdk)
            return LrDevelopController.getRange(sdk)
        end,
        set_value = function(sdk, value)
            LrDevelopController.setValue(sdk, value)
        end,
        track = function(sdk)
            pcall(function()
                LrDevelopController.startTracking(sdk)
            end)
        end,
        invert_mask = function(id)
            return LrDevelopController.invertMask(id)
        end,
        go_to_masking = function()
            LrDevelopController.goToMasking()
        end,
        go_to_remove = function()
            LrDevelopController.goToRemove()
        end,
    }
end

local function write_report(core, entries)
    local directory = support_dir()
    if not LrFileUtils.exists(directory) then
        LrFileUtils.createAllDirectories(directory)
    end
    local probed_at = os.date("!%Y-%m-%dT%H:%M:%SZ")
    local json = Core.report_json(entries, version_string(), tostring(core.catalog.sdkVersion or ""), probed_at)
    local path = LrPathUtils.child(directory, "compat.json")
    local handle = io.open(path, "w")
    if handle then
        handle:write(json)
        handle:close()
    end
    return probed_at
end

local existing = rawget(_G, "LRKeysState")
if existing and existing.started then
    return
end

local catalog = load_catalog()
if catalog == nil then
    return
end

local core = Core.new(make_api(), catalog)
core:set_mapped(mapped_names())

pcall(function()
    LrDevelopController.setTrackingDelay(0.4)
end)

local state = {
    started = true,
    shutdown = false,
    connected = false,
    socket = nil,
    core = core,
    port = read_port(),
    lastSummary = "",
    reconnecting = false,
}

local function summarize(entries)
    local pass_count, fail_count, skip_count = 0, 0, 0
    for _, entry in ipairs(entries) do
        if entry.status == "pass" then
            pass_count = pass_count + 1
        elseif entry.status == "fail" then
            fail_count = fail_count + 1
        else
            skip_count = skip_count + 1
        end
    end
    return pass_count, fail_count, skip_count
end

local function publish(entries, reason)
    local probed_at = "unwritten"
    local wrote, stamp = pcall(function()
        return write_report(core, entries)
    end)
    if wrote and type(stamp) == "string" then
        probed_at = stamp
    else
        logger:error("LR Keys could not write compat.json: " .. tostring(stamp))
    end
    local pass_count, fail_count, skip_count = summarize(entries)
    local summary = string.format(
        "%s. Lightroom %s. Targeted SDK %s (minimum %s). %d pass, %d fail, %d skip. %s",
        reason,
        version_string(),
        tostring(catalog.sdkVersion),
        tostring(catalog.sdkMinimumVersion),
        pass_count,
        fail_count,
        skip_count,
        probed_at
    )
    state.lastSummary = summary
    state.lastEntries = entries
    logger:info("LR Keys " .. summary)
    for _, entry in ipairs(entries) do
        if entry.status == "fail" then
            logger:info("LR Keys unsupported " .. entry.scope .. " " .. entry.name .. " " .. tostring(entry.detail))
        end
    end
end

core.before_probe = function()
    core:set_mapped(mapped_names())
end

core.on_probe = function(entries)
    publish(entries, "probe")
end

local function run_probe(reason)
    local names = mapped_names()
    core:set_mapped(names)
    local entries = core:probe()
    publish(entries, reason)
    return core:format_report(entries)
end

function state.shutdownNow()
    state.shutdown = true
    state.started = false
    if state.socket then
        pcall(function()
            state.socket:close()
        end)
    end
end

_G.LRKeysState = state
_G.LRKeysShutdown = function()
    state.shutdownNow()
end

local function schedule_reconnect(socket)
    if state.shutdown or state.reconnecting then
        return
    end
    state.reconnecting = true
    state.connected = false
    LrTasks.startAsyncTask(function()
        LrTasks.sleep(0.5)
        state.reconnecting = false
        if state.shutdown then
            return
        end
        pcall(function()
            socket:reconnect()
        end)
    end)
end

local function send_lines(socket, lines)
    for _, line in ipairs(lines) do
        pcall(function()
            socket:send(line .. "\n")
        end)
    end
end

LrTasks.startAsyncTask(function()
    local startup_lines = run_probe("startup")
    LrFunctionContext.callWithContext("lrkeys.socket", function(context)
        local port = state.port
        logger:info("LR Keys listening on 127.0.0.1:" .. tostring(port))
        local socket = LrSocket.bind({
            functionContext = context,
            plugin = _PLUGIN,
            port = port,
            mode = "receive",
            onConnected = function(connected_socket)
                state.connected = true
                state.socket = connected_socket
                logger:info("LR Keys app connected")
                send_lines(connected_socket, startup_lines)
            end,
            onClosed = function(closed_socket)
                state.connected = false
                logger:info("LR Keys socket closed")
                schedule_reconnect(closed_socket)
            end,
            onError = function(error_socket, err)
                state.connected = false
                logger:info("LR Keys socket error: " .. tostring(err))
                schedule_reconnect(error_socket)
            end,
            onMessage = function(message_socket, message)
                local ok, replies = pcall(function()
                    return core:push(message or "")
                end)
                if not ok then
                    logger:error("LR Keys message failed: " .. tostring(replies))
                    return
                end
                send_lines(message_socket, replies)
            end,
        })
        state.socket = socket
        while not state.shutdown do
            LrTasks.sleep(0.5)
        end
        pcall(function()
            socket:close()
        end)
    end)
end)
