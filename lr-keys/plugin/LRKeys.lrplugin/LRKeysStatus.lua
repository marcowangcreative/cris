local LrDialogs = import "LrDialogs"

local state = rawget(_G, "LRKeysState") or {}
local lines = {
    state.connected and "Socket: connected to the menu-bar app." or "Socket: waiting for the menu-bar app on port " .. tostring(state.port or 58421) .. ".",
    state.lastSummary or "Compat check has not run yet.",
    "",
    "Run Compat Check from the LR Keys menu-bar icon after a Lightroom update.",
    "Open a photo in Develop first, or slider probes are skipped rather than failed.",
}
if state.lastEntries then
    lines[#lines + 1] = ""
    for _, entry in ipairs(state.lastEntries) do
        if entry.status == "fail" then
            lines[#lines + 1] = "Fail  " .. entry.scope .. "  " .. entry.name .. "  " .. tostring(entry.detail or "")
        end
    end
end
LrDialogs.message("LR Keys", table.concat(lines, "\n"), "info")
