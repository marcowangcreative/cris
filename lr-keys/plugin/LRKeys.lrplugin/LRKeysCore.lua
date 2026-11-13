-- Develop command engine for LR Keys.
-- No Lightroom imports, so the same file runs under lua 5.1 tests.
-- Slider limits always come from api.get_range. The catalog's temperature
-- note is not consulted.

local Core = {}
Core.__index = Core

function Core.fold(name)
    return (string.lower(tostring(name or "")):gsub("[^%w]", ""))
end

function Core.new(api, catalog)
    local self = setmetatable({
        api = api,
        catalog = catalog,
        buffer = "",
        by_name = {},
        mapped = nil,
    }, Core)
    for _, parameter in ipairs(catalog.parameters or {}) do
        self:_index(parameter.canonical, parameter)
        self:_index(parameter.displayName, parameter)
        self:_index(parameter.sdkName, parameter)
        if parameter.maskSDKName then
            self:_index(parameter.maskSDKName, parameter)
        end
        for _, alias in ipairs(parameter.aliases or {}) do
            self:_index(alias, parameter)
        end
    end
    return self
end

function Core:_index(name, parameter)
    if name and name ~= "" then
        self.by_name[Core.fold(name)] = parameter
    end
end

function Core:lookup(name)
    return self.by_name[Core.fold(name)]
end

function Core:set_mapped(names)
    if names == nil then
        self.mapped = nil
        return
    end
    local wanted = {}
    for _, name in ipairs(names) do
        local parameter = self:lookup(name)
        if parameter then
            wanted[parameter.canonical] = true
        end
    end
    self.mapped = wanted
end

function Core.mapped_from_keymap(decoded)
    local names = {}
    if type(decoded) ~= "table" or type(decoded.bindings) ~= "table" then
        return names
    end
    for _, binding in ipairs(decoded.bindings) do
        if type(binding) == "table" and type(binding.parameter) == "string" then
            names[#names + 1] = binding.parameter
        end
    end
    return names
end

function Core:push(chunk)
    self.buffer = self.buffer .. (chunk or "")
    local replies = {}
    while true do
        local newline = string.find(self.buffer, "\n", 1, true)
        if not newline then
            break
        end
        local line = string.sub(self.buffer, 1, newline - 1)
        self.buffer = string.sub(self.buffer, newline + 1)
        if string.sub(line, -1) == "\r" then
            line = string.sub(line, 1, -2)
        end
        if line ~= "" then
            local handled = self:handle(line)
            for index = 1, #handled do
                replies[#replies + 1] = handled[index]
            end
        end
    end
    return replies
end

function Core:handle(line)
    local ok, result = pcall(function()
        return self:dispatch(line)
    end)
    if not ok then
        local message = tostring(result)
        message = string.gsub(message, "[%c]", " ")
        if string.len(message) > 180 then
            message = string.sub(message, 1, 180)
        end
        return { "err " .. message }
    end
    return result
end

function Core:dispatch(line)
    local cleaned = string.gsub(line, "^%s+", "")
    cleaned = string.gsub(cleaned, "%s+$", "")
    local parts = {}
    for token in string.gmatch(cleaned, "%S+") do
        parts[#parts + 1] = token
    end
    local verb = string.lower(parts[1] or "")
    if verb == "ping" then
        if #parts ~= 2 then
            error("expected ping TOKEN")
        end
        return { "pong " .. parts[2] }
    end
    if verb == "probe" then
        if #parts ~= 1 then
            error("expected probe")
        end
        if self.before_probe then
            self.before_probe()
        end
        local entries = self:probe()
        if self.on_probe then
            self.on_probe(entries)
        end
        return self:format_report(entries)
    end
    if verb == "inc" or verb == "dec" then
        if #parts ~= 3 then
            error("expected inc PARAMETER DELTA")
        end
        local delta = tonumber(parts[3])
        if delta == nil then
            error("bad delta")
        end
        if verb == "dec" then
            delta = -delta
        end
        self:adjust(parts[2], delta)
        return { "ok " .. cleaned }
    end
    if verb == "toggle" then
        if #parts ~= 2 then
            error("expected toggle PARAMETER")
        end
        local state = self:toggle(parts[2])
        return { "ok " .. cleaned .. " " .. state }
    end
    if verb == "run" then
        if #parts ~= 2 then
            error("expected run COMMAND")
        end
        self:run(parts[2])
        return { "ok " .. cleaned }
    end
    error("unknown command")
end

function Core:require_develop()
    if self.api.module_name() ~= "develop" then
        error("not in develop")
    end
end

function Core:masking()
    return self.api.tool and self.api.tool() == "masking"
end

function Core:adjust(parameter, delta)
    self:require_develop()
    local spec = self:lookup(parameter)
    if spec == nil or spec.kind ~= "adjust" then
        error("unknown parameter " .. tostring(parameter))
    end
    local sdk = spec.sdkName
    if self:masking() then
        if spec.maskSDKName == nil or spec.maskSDKName == "" then
            error("no mask slider for " .. spec.canonical)
        end
        local mask_id = self.api.selected_mask and self.api.selected_mask() or nil
        if mask_id == nil or mask_id == "" then
            error("no mask selected")
        end
        sdk = spec.maskSDKName
    end
    if self.api.track then
        self.api.track(sdk)
    end
    local current = self.api.get_value(sdk)
    if type(current) ~= "number" then
        error("parameter has no numeric value")
    end
    local minimum, maximum = self.api.get_range(sdk)
    local updated = current + delta
    if type(minimum) == "number" and updated < minimum then
        updated = minimum
    end
    if type(maximum) == "number" and updated > maximum then
        updated = maximum
    end
    self.api.set_value(sdk, updated)
end

function Core:toggle(parameter)
    self:require_develop()
    local spec = self:lookup(parameter)
    if spec == nil or spec.kind ~= "toggle" then
        error("unknown toggle " .. tostring(parameter))
    end
    local current = self.api.get_value(spec.sdkName)
    local turn_on = not (current == true or current == 1)
    self.api.set_value(spec.sdkName, turn_on and 1 or 0)
    if turn_on then
        return "on"
    end
    return "off"
end

function Core:run(name)
    local spec = self:lookup(name)
    if spec == nil or spec.kind ~= "run" then
        error("unknown run " .. tostring(name))
    end
    if spec.probe == "function" then
        if not self.api.has_function(spec.sdkName) then
            error("missing " .. spec.sdkName)
        end
        if spec.sdkName == "invertMask" then
            self:require_develop()
            if not self:masking() then
                if self.api.has_function("goToMasking") and self.api.go_to_masking then
                    self.api.go_to_masking()
                else
                    error("masking is not open")
                end
            end
            local mask_id = self.api.selected_mask()
            if mask_id == nil or mask_id == "" then
                error("no mask selected")
            end
            local inverted, message = self.api.invert_mask(mask_id)
            if inverted == false then
                error(message or "invert failed")
            end
            return
        end
        if spec.sdkName == "goToMasking" then
            self:require_develop()
            self.api.go_to_masking()
            return
        end
        if spec.sdkName == "goToRemove" then
            self:require_develop()
            self.api.go_to_remove()
            return
        end
        error("no handler for " .. spec.sdkName)
    end
    self:require_develop()
    if Core.fold(spec.canonical) == "autostraighten" then
        -- Catalog develop settings use 2 for Upright Level. Unverified
        -- when written through LrDevelopController. See the README.
        self.api.set_value(spec.sdkName, 2)
        return
    end
    error("no handler for " .. spec.canonical)
end

function Core:probe()
    local entries = {}
    local in_develop = self.api.module_name() == "develop"
    for _, spec in ipairs(self.catalog.parameters or {}) do
        if self.mapped == nil or self.mapped[spec.canonical] then
            entries[#entries + 1] = self:probe_parameter(spec, in_develop)
        end
    end
    for _, fn in ipairs(self.catalog.functions or {}) do
        entries[#entries + 1] = self:probe_function(fn)
    end
    return entries
end

function Core:probe_parameter(spec, in_develop)
    if spec.probe == "function" then
        if self.api.has_function(spec.sdkName) then
            return {
                scope = "parameter",
                name = spec.canonical,
                status = "pass",
                detail = spec.sdkName,
            }
        end
        return {
            scope = "parameter",
            name = spec.canonical,
            status = "fail",
            detail = "missing " .. spec.sdkName,
        }
    end
    if not in_develop then
        return {
            scope = "parameter",
            name = spec.canonical,
            status = "skip",
            detail = "not in develop",
        }
    end
    local value_ok, value = pcall(function()
        return self.api.get_value(spec.sdkName)
    end)
    if not value_ok or value == nil then
        return {
            scope = "parameter",
            name = spec.canonical,
            status = "fail",
            detail = "getValue failed",
        }
    end
    if spec.kind ~= "adjust" then
        return {
            scope = "parameter",
            name = spec.canonical,
            status = "pass",
            detail = "",
        }
    end
    local range_ok, minimum, maximum = pcall(function()
        return self.api.get_range(spec.sdkName)
    end)
    if not range_ok or type(minimum) ~= "number" or type(maximum) ~= "number" then
        return {
            scope = "parameter",
            name = spec.canonical,
            status = "fail",
            detail = "getRange failed",
        }
    end
    return {
        scope = "parameter",
        name = spec.canonical,
        status = "pass",
        detail = "",
        minimum = minimum,
        maximum = maximum,
    }
end

function Core:probe_function(fn)
    if self.api.has_function(fn.name) then
        return {
            scope = "function",
            name = fn.name,
            status = "pass",
            detail = "since " .. tostring(fn.since or ""),
        }
    end
    return {
        scope = "function",
        name = fn.name,
        status = "fail",
        detail = "missing",
    }
end

function Core:format_report(entries)
    local version = "unknown"
    if self.api.version_string then
        version = tostring(self.api.version_string() or "unknown")
    end
    local sdk = tostring(self.catalog.sdkVersion or "")
    local lines = {
        "compat begin",
        "compat version lightroom " .. version,
        "compat version sdk " .. sdk,
    }
    for _, entry in ipairs(entries) do
        lines[#lines + 1] = Core.format_entry(entry)
    end
    lines[#lines + 1] = "compat end"
    return lines
end

function Core.format_entry(entry)
    local line = "compat " .. entry.status .. " " .. entry.scope .. " " .. entry.name
    if type(entry.minimum) == "number" and type(entry.maximum) == "number" then
        line = line .. " min=" .. Core.format_number(entry.minimum) .. " max=" .. Core.format_number(entry.maximum)
    end
    if entry.detail and entry.detail ~= "" then
        line = line .. " detail=" .. entry.detail
    end
    return line
end

function Core.format_number(value)
    if value == math.floor(value) then
        return string.format("%d", value)
    end
    local text = string.format("%.6f", value)
    text = string.gsub(text, "0+$", "")
    text = string.gsub(text, "%.$", "")
    return text
end

function Core.json_string(value)
    local text = tostring(value or "")
    text = string.gsub(text, "\\", "\\\\")
    text = string.gsub(text, "\"", "\\\"")
    text = string.gsub(text, "\n", "\\n")
    text = string.gsub(text, "\r", "\\r")
    return "\"" .. text .. "\""
end

function Core.report_json(entries, lightroom_version, sdk_version, probed_at)
    local body = {}
    for _, entry in ipairs(entries) do
        local fields = {
            "\"scope\":" .. Core.json_string(entry.scope),
            "\"name\":" .. Core.json_string(entry.name),
            "\"status\":" .. Core.json_string(entry.status),
            "\"detail\":" .. Core.json_string(entry.detail or ""),
        }
        if type(entry.minimum) == "number" and type(entry.maximum) == "number" then
            fields[#fields + 1] = "\"minimum\":" .. Core.format_number(entry.minimum)
            fields[#fields + 1] = "\"maximum\":" .. Core.format_number(entry.maximum)
        end
        body[#body + 1] = "{" .. table.concat(fields, ",") .. "}"
    end
    return "{"
        .. "\"lightroomVersion\":" .. Core.json_string(lightroom_version)
        .. ",\"sdkVersion\":" .. Core.json_string(sdk_version)
        .. ",\"probedAt\":" .. Core.json_string(probed_at or "")
        .. ",\"entries\":[" .. table.concat(body, ",") .. "]}"
end

return Core
