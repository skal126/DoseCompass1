# DoseCompass — ESP32 4-servo compatible app

This version adapts the supplied DoseCompass web app to the supplied
`ESP32_Medicine_Dispenser_BLE.ino` firmware. The ESP32 firmware and
`PlanTypes.h` are included unchanged in `firmware-reference/` for reference.

## Hardware and compartment mapping

The firmware controls four SG90 servos. The app now displays four compartments:

| App compartment | Firmware index | ESP32 signal GPIO |
|---|---:|---:|
| 1 | 0 | 13 |
| 2 | 1 | 14 |
| 3 | 2 | 27 |
| 4 | 3 | 33 |

A dispense action runs one complete servo cycle. The app's pill-count field is
kept as a display/record field; the supplied firmware does not use it to make
multiple servo movements.

## Connection modes

### Bluetooth LE (Chrome)

Use **Connect Bluetooth** and select `DC-PROTO-02`.

The firmware's GATT service and characteristics are:

- Service: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- Write characteristic: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- Telemetry characteristic: `13187b10-80a2-4a00-a2ef-98844e135540`

The app sends a single raw UTF-8 digit (`0`, `1`, `2` or `3`) with **no
newline** for manual dispensing. It reads weight and servo status notifications
from the telemetry characteristic.

The current firmware BLE write callback accepts only a compartment index. It
does not accept clock, plan, tare, `PING`, `HOME`, `DROP`, or `DELAY` commands.
Therefore:
- Manual dispensing and weight telemetry work over BLE.
- Clock setting, plan synchronization and tare require USB Serial.
- If a saved daily schedule was previously synchronized to the ESP32 over
  Serial, the ESP32 can continue executing it while the app is connected over
  BLE or the app is closed.
- If you edit a schedule while connected over BLE, the ESP32 continues using
  its previous saved plan until you connect over USB Serial and synchronize.

### USB Serial

Connect the ESP32 with a USB data cable, select **USB Serial**, and use
**115200 baud**. Close Arduino IDE Serial Monitor before opening the port.

On Serial connection the app:
- Sets the ESP32 clock using the firmware's `T <local-epoch-seconds>` format
  when automatic clock synchronization is enabled.
- Queries the stored plans with `P?`.
- Reads the current scale value with `w`.

Use **Sync 4 Plans** to write all four app plans to ESP32 flash. Editing a plan
while Serial is connected also sends that compartment's updated plan.

The app maps its plan fields to the firmware format:

`P <index> <enabled> <startDay> <courseDays> <count> <minute1> ... <minuteN>|<name>`

Times are sent as minutes after midnight. Up to eight times per day and a
course duration of 1–365 days are supported.

## Scheduling limitations

- When all seven weekdays are selected, the plan is stored in ESP32 and runs
  from the firmware scheduler, independent of the browser. Use **Sync 4 Plans**
  over USB Serial after configuring the plans.
- If only selected weekdays are enabled, the firmware cannot represent that
  weekly pattern. The app disables that slot's ESP32 plan and triggers it from
  the browser instead. The app must be connected over USB Serial, the four plans must have been
  synchronized, and the page must remain open at the scheduled time.
- One-time delay/snooze is available only for app-managed weekday-specific
  schedules. The firmware has no one-time delay command for its daily plans.
- The firmware starts plans on the configured start day and supports up to
  365 consecutive course days.

## Scale controls

- Weight readings are received as `WEIGHT:<grams>g` notifications/reports.
- `Read Now` reads the current telemetry value over BLE or sends `w` over Serial.
- Tare is supported only over Serial using the single-character command `t`.
- The app waits for the firmware's `Tared` response before reporting tare success.

## Run the app

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Open the local Vite URL in Chrome. Web Bluetooth and Web Serial require a secure
context; `localhost` is normally treated as secure by Chrome. For a hosted
deployment, use HTTPS.

## Important validation before medicine use

1. Test each servo with the dispensing mechanism unloaded.
2. Verify compartment 1 operates GPIO 13, compartment 2 GPIO 14,
   compartment 3 GPIO 27 and compartment 4 GPIO 33.
3. Calibrate the HX711 using known weights and verify the reported grams.
4. Confirm the ESP32 clock and each `PLAN` / `STAT` response in the packet
   console after synchronization.
5. Test with inert test material before loading actual medicine.

Use a separate regulated 5 V servo supply with a common ground to the ESP32.
Do not treat the app's pill-count field as a physical pill-count control: the
supplied firmware performs one servo cycle per dispense request.
