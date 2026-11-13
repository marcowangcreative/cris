-- Minimal JSON reader for the LR Keys catalog and keymap.
-- Lua 5.1. Returns the decoded value, or nil plus an error string.

local JSON = {}

local function decode_at(text, index)
    local n = #text

    local function peek()
        return string.sub(text, index, index)
    end

    local function skip()
        while index <= n do
            local c = peek()
            if c == " " or c == "\n" or c == "\r" or c == "\t" then
                index = index + 1
            else
                return
            end
        end
    end

    local parse_value

    local function parse_string()
        index = index + 1
        local parts = {}
        while index <= n do
            local c = string.sub(text, index, index)
            index = index + 1
            if c == '"' then
                return table.concat(parts)
            end
            if c == "\\" then
                local escape = string.sub(text, index, index)
                index = index + 1
                if escape == '"' or escape == "\\" or escape == "/" then
                    parts[#parts + 1] = escape
                elseif escape == "n" then
                    parts[#parts + 1] = "\n"
                elseif escape == "t" then
                    parts[#parts + 1] = "\t"
                elseif escape == "r" then
                    parts[#parts + 1] = "\r"
                elseif escape == "u" then
                    local hex = string.sub(text, index, index + 3)
                    index = index + 4
                    local code = tonumber(hex, 16) or 63
                    if code < 128 then
                        parts[#parts + 1] = string.char(code)
                    else
                        parts[#parts + 1] = "?"
                    end
                else
                    parts[#parts + 1] = escape
                end
            else
                parts[#parts + 1] = c
            end
        end
        error("unterminated string")
    end

    local function parse_number()
        local start = index
        if peek() == "-" then
            index = index + 1
        end
        while string.match(peek(), "%d") do
            index = index + 1
        end
        if peek() == "." then
            index = index + 1
            while string.match(peek(), "%d") do
                index = index + 1
            end
        end
        if peek() == "e" or peek() == "E" then
            index = index + 1
            if peek() == "+" or peek() == "-" then
                index = index + 1
            end
            while string.match(peek(), "%d") do
                index = index + 1
            end
        end
        local slice = string.sub(text, start, index - 1)
        local number = tonumber(slice)
        if number == nil then
            error("bad number " .. slice)
        end
        return number
    end

    local function parse_array()
        index = index + 1
        local array = {}
        skip()
        if peek() == "]" then
            index = index + 1
            return array
        end
        while true do
            array[#array + 1] = parse_value()
            skip()
            local c = peek()
            if c == "]" then
                index = index + 1
                return array
            end
            if c ~= "," then
                error("expected comma in array")
            end
            index = index + 1
            skip()
        end
    end

    local function parse_object()
        index = index + 1
        local object = {}
        skip()
        if peek() == "}" then
            index = index + 1
            return object
        end
        while true do
            skip()
            if peek() ~= '"' then
                error("expected string key")
            end
            local key = parse_string()
            skip()
            if peek() ~= ":" then
                error("expected colon")
            end
            index = index + 1
            object[key] = parse_value()
            skip()
            local c = peek()
            if c == "}" then
                index = index + 1
                return object
            end
            if c ~= "," then
                error("expected comma in object")
            end
            index = index + 1
        end
    end

    function parse_value()
        skip()
        local c = peek()
        if c == '"' then
            return parse_string()
        end
        if c == "{" then
            return parse_object()
        end
        if c == "[" then
            return parse_array()
        end
        if c == "t" and string.sub(text, index, index + 3) == "true" then
            index = index + 4
            return true
        end
        if c == "f" and string.sub(text, index, index + 4) == "false" then
            index = index + 5
            return false
        end
        if c == "n" and string.sub(text, index, index + 3) == "null" then
            index = index + 4
            return nil
        end
        if c == "-" or string.match(c, "%d") then
            return parse_number()
        end
        error("unexpected " .. c)
    end

    local ok, value = pcall(parse_value)
    if not ok then
        return nil, value
    end
    return value
end

function JSON.decode(text)
    if type(text) ~= "string" then
        return nil, "json input must be a string"
    end
    return decode_at(text, 1)
end

return JSON
