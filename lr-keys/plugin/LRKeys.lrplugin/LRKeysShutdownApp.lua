local function shutdown()
    if rawget(_G, "LRKeysShutdown") then
        _G.LRKeysShutdown()
    end
end

return {
    LrShutdownFunction = function(doneFunction, _)
        shutdown()
        doneFunction()
    end,
}
