# LR Keys

LR Keys maps keyboard shortcuts to Lightroom Classic Develop adjustments so you can edit without mousing around the panels. It is Marco's own version of [Power Keys](https://www.getpowerkeys.com/) (closed source, last release 3.2.2 in December 2025, before Lightroom Classic 16.0 shipped in November 2026).

Power Keys turns each key into a `powerkeys://` URL, which a bundled Lua plugin then handles. That round trip is the lag. LR Keys keeps one localhost socket open and sends a short text command, the same shape of split MIDI2LR uses (app on one side, Lightroom plugin on the other). The code here is original. MIDI2LR is GPL-3.0 and was not copied.

## Pieces

1. **Menu-bar app** (`swift build`, macOS 13+). A `CGEventTap` captures keys only while Lightroom Classic is the frontmost app. Unmapped keys, Command and Control shortcuts, and text fields are passed through. Option is a 0.5× step and Shift is a 2× step. Holding both multiplies, so the defaults land back on 1×.
2. **`plugin/LRKeys.lrplugin`**. Listens on `127.0.0.1:58421` with `LrSocket`, reconnects on its own, and applies `inc`, `toggle`, and `run` through `LrDevelopController`. Slider limits come from `getRange` for the open photo.
3. **`develop-parameters.json`**. Parameter names, SDK names, default step sizes, and which functions to probe. A new Lightroom version should be a catalog edit plus a compat check, not a hunt through Swift and Lua.
4. **Shortcut editor** with conflict detection, a Power Keys map importer, and a HUD such as `Shadows +5`.
5. **Compat check** in the menu bar. After a Lightroom update, run it from Develop and read the pass/fail list.

```
key down (Lightroom frontmost, not a text field)
  -> keymap + step math
  -> TCP 127.0.0.1:58421
  -> LRKeys.lrplugin
  -> LrDevelopController
```

## Install

On Marco's Mac, from this folder:

```sh
swift build -c release
codesign --force --sign - .build/release/lr-keys
cp -R .build/release/lr-keys "$HOME/Applications/LR Keys"
xattr -dr com.apple.quarantine "$HOME/Applications/LR Keys" 2>/dev/null || true
"$HOME/Applications/LR Keys"
```

`~/Applications` is not created by macOS. `mkdir -p "$HOME/Applications"` if it is missing. A stable path matters: Accessibility permission is tied to the binary, and `swift run` rebuilds into `.build`, which makes macOS ask again.

Grant Accessibility when macOS prompts (System Settings → Privacy & Security → Accessibility). The app is a menu-bar item named **LR Keys**. It has no Dock icon.

Install the plugin from Lightroom Classic:

1. File → Plug-in Manager → Add.
2. Choose `plugin/LRKeys.lrplugin`.
3. Enable **LR Keys**.
4. If the Plug-in Extras item does not appear, restart Lightroom.

The plugin also loads from `~/Library/Application Support/Adobe/Lightroom/Modules/`, but plugins in that folder can only be disabled, not removed. Plug-in Manager is the better install for now.

The app writes its keymap and the port to `~/Library/Application Support/LR Keys/`. The plugin reads `port.txt` when it starts (default **58421**). Change the port in the keymap and reload the plugin in Plug-in Manager.

## Default keys

This is a starting map, not a recovered copy of the Power Keys MWP map. Mapped keys are swallowed while Lightroom is frontmost, including letters Lightroom uses for flags and views. Change them in **Shortcut Editor…**.

| Decrease | Increase | Adjustment |
| --- | --- | --- |
| Q | W | Exposure (0.10) |
| E | R | Contrast (5) |
| T | Y | Highlights (5) |
| A | S | Shadows (5) |
| D | F | Whites (5) |
| G | H | Blacks (5) |
| Z | X | Temp (100) |
| C | V | Tint (5) |
| B | N | Saturation (5) |

| Key | Action |
| --- | --- |
| `[` | Profile Corrections |
| `]` | Chromatic Aberration |
| `;` | Auto Straighten |
| `'` | Constrain Crop |
| `/` | Invert Mask |

`S` with nothing held shows **Shadows +5**. Option+S is +2.5. Shift+S is +10. Option+Shift+S is +5 again.

Keys are US-ANSI physical positions. On another layout, the key in the Q position still drives Exposure.

## How to test it in Lightroom

Nothing in this repo was run against Lightroom. The VM that built it cannot launch Lightroom Classic, so the checklist below is untested end to end.

1. Build and launch the menu-bar app. The menu should say Accessibility granted after you allow it.
2. Add and enable the plugin. File → Plug-in Extras (or Library → Plug-in Extras) → **LR Keys: Connection And Compat** should say the socket is connected once the app is running. The log is `~/Library/Logs` via Lightroom's `LrLogger` (look for `LRKeys`).
3. Open a raw photo in Develop. Press `S`. Shadows should move by +5 and the HUD should show `Shadows +5`.
4. Hold Option and press `S` again (+2.5). Hold Shift (+10).
5. Press `[` to toggle profile corrections, `;` for auto straighten, `/` with a mask selected for invert.
6. Click into a keyword or filename field and type. Mapped letters should type normally when macOS reports the focus as a text field. See the risks below if they do not.
7. Switch to another app. Keys must behave normally there. Switch back to Lightroom and the tap should return.
8. Menu bar → **Compat Check**, with Develop open. You want passes for the sliders you use. Failures are greyed in the shortcut editor and the key shows `<name> unsupported` instead of sending a command.
9. Optional, without Lightroom: `python3 harness/latency.py --serve --port 58421` and then `.build/release/lr-keys probe --port 58421`.

`lr-keys check keymap.json` and `lr-keys import some-power-keys.json` work on the command line, including on Linux. With no command, the Mac build opens the menu bar.

## Compat check

The plugin probes when it loads and whenever the app sends `probe`.

- Adjustments: `getValue` and `getRange` while Develop is active. The numbers in the list are the live range, so a Classic 16 raw file should show Temperature from **1500**, and a non-raw file from **-150**. Those floors are not hardcoded.
- Toggles: `getValue` only.
- Functions (`goToMasking`, `goToRemove`, `invertMask`, and the SDK 6 getters/setters): existence only. The check does not switch tools.
- If the current module is not Develop, slider rows are **Skip**, not Fail. Skips are not greyed out.

The plugin writes `~/Library/Application Support/LR Keys/compat.json` and sends the same result on the socket. The menu-bar window prefers the socket reply and, if none arrives within about a second and a half, reads the file. Startup also logs `LrApplication.versionString()` and the targeted SDK version.

## Maintaining this after a Lightroom update

VSCO Keys is the cautionary tale. It was discontinued as a product in August 2015 and [open-sourced](https://github.com/vsco/keys) (GPL-2.0). Later Lightroom releases broke it; the upstream README says so directly. A community fork carried it for a while and then stopped. Power Keys 3.2.2 (December 2025) has the same shape of risk relative to Classic 16 (November 2026). LR Keys does not copy either codebase. VSCO Keys is still worth reading for how a keyboard layout described adjustments.

After each Classic update:

1. Open a photo in Develop and run **Compat Check**. Failures name the parameter or the SDK function that disappeared or was renamed.
2. Edit `Sources/LRKeysCore/Resources/develop-parameters.json`. Change `sdkName` / `maskSDKName`, add a parameter, or change a default step. Do **not** put the new slider minimum in Swift or Lua. `getRange` is the clamp. Update `temperatureNote` (or the parameter `note`) so the next person knows what Adobe changed. Classic 16 lowered Temperature from 2000 to 1500 (raw) and from -100 to -150 (non-raw); that text is documentation only.
3. Copy the file to `plugin/LRKeys.lrplugin/develop-parameters.json`. `make test-catalog-sync` fails if the two copies differ. Lightroom only reads the copy inside the plugin folder.
4. Reload the plugin in Plug-in Manager and run Compat Check again.
5. If Adobe publishes a newer SDK document, set `LrSdkVersion` in `Info.lua` and `sdkVersion` in the catalog to match. Leave `LrSdkMinimumVersion` at **6.0** unless a call you refuse to probe becomes required. 6.0 is when `LrDevelopController` and `LrSocket` appeared. Masks, `invertMask`, `goToMasking`, and `goToRemove` are probed and reported when the running app does not have them.
6. Read the log line that includes the Lightroom version string and the targeted SDK. That is the record of what the compat check ran against.

The plugin calls `goToMasking` and `goToRemove`. It does not call `goToHealing`, `goToSpotRemoval`, or `resetBrushing`.

`LrSdkVersion` is **16.0** because that is the Classic version this was written against. The newest separately published SDK narrative found at the time was 15.3; Adobe often posts the SDK kit after the .0 release. If a future Classic refuses a plugin whose declared SDK is newer than the host, lower `LrSdkVersion` to that app and keep the minimum at 6.0. The probe, not the manifest number, is what says a control still works.

## Command protocol

One UTF-8 line per command, newline terminated. The plugin listens. The app connects.

```
inc Exposure2012 0.1
inc Shadows2012 5
dec Shadows2012 5
toggle EnableProfileCorrections
run AutoStraighten
run InvertMask
ping 7
probe
```

`inc` adds the delta (it may be negative). `dec` subtracts it. Replies are `ok …`, `err …`, `pong <token>`, or a compat block:

```
compat begin
compat version lightroom 16.0
compat version sdk 16.0
compat pass parameter Temperature min=1500 max=50000
compat fail function goToRemove detail=missing
compat skip parameter Shadows2012 detail=not in develop
compat end
```

`Exposure2012` is our name. The plugin translates it with the catalog (`Exposure`, and `local_Exposure` when the masking tool is open and a mask is selected). Profile corrections map to `LensProfileEnable`, chromatic aberration to `AutoLateralCA`, constrain crop to `CropConstrainToWarp`. Auto straighten sets `PerspectiveUpright` to 2, which is Level in catalog develop settings. That number has not been confirmed through `LrDevelopController`.

## Power Keys importer

There was no MWP map file to copy. `examples/powerkeys-mwp-map.json` is a plausible export, not a captured one. The importer also accepts a dictionary (`"Exposure": {"up","down","step"}`), flat keys (`"Exposure.decrease"`), numeric virtual key codes, and unknown entries. Unknown rows become warnings. A file that yields no bindings is an error. Native LR Keys JSON (a `bindings` array with `kind` and `parameter`) round-trips.

## What was verified, and what was not

Verified on Linux, with no Lightroom installed:

- `swift test` — keymap parsing, conflict detection, Option/Shift step math, the wire protocol, compat-report parsing, grey-out rules, the Power Keys importer, and a localhost socket round trip.
- `lua5.1 plugin/tests/test_core.lua` — command application, live `getRange` clamping (including a fake Classic 16 temperature floor and a fake older floor), mask routing, probe pass/fail/skip, and the rule that the probe does not call `goToMasking` or `goToRemove`.
- `python3 -m unittest discover -s harness -v` — mock plugin server and round-trip timing.

Not verified, because this environment cannot run Lightroom Classic or the Mac UI:

- The menu-bar app, event tap, Accessibility prompt, HUD, and shortcut editor.
- `LrSocket` inside Lightroom, including whether `socket:send` works on a receive-mode socket (the compat file is the fallback).
- Real slider movement, mask sliders, invert, upright Level, or `CropConstrainToWarp`.
- Signing, notarization, and Gatekeeper.

## Known risks

- **Mask sliders.** `local_*` parameters are documented, and they require the masking tool and a selected mask. Some mask controls still are not settable this way. Compat Check plus one masked photo is the test.
- **Socket.** `LrSocket` is localhost only, one connection, and it times out when idle. The app sends `ping` about once a second. `send` on a receive socket is not a documented call; replies are attempted and also written to `compat.json`. A firewall or another process on 58421 will look like "Not connected".
- **Signing and notarization.** The binary is ad-hoc signed at most (`codesign -s -`). It is not notarized. Accessibility permission sticks to a cdhash, so a rebuild asks again. A real Developer ID signature and notarization are required before this is handed to anyone but Marco.
- **Text fields.** Pass-through depends on the Accessibility role. Lightroom's tree is patchy. If a field swallows nothing and a shortcut fires while typing, that is this gap.
- **Auto straighten and constrain crop.** Upright's numeric Level value, and whether `setValue("CropConstrainToWarp")` is accepted, are unconfirmed.
- **Temperature.** Raw temperature is logarithmic in the SDK even though `getValue`/`setValue` use Kelvin. A step of 100 is a linear Kelvin nudge. Non-raw uses a different live range (about -150…100 on Classic 16). Per-camera maps are how that should be handled later.
- **Lightroom updates.** A renamed SDK parameter fails the probe and is greyed. It does not silently no-op. Something the probe cannot see (a behavior change behind the same name) still needs the manual Develop test above.

## Next steps

Presets, before/after, copy/paste settings, per-camera maps, and an f/uno handoff. Library quick-develop is also out of scope; commands currently require the Develop module.

## Tests

```sh
export PATH="$HOME/swift/usr/bin:$PATH"   # or any Swift 5.9+ toolchain
make test
```

`make test` checks the two catalog copies, then runs Swift, Lua 5.1, and the Python harness.
