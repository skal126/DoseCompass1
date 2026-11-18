export interface ArduinoSketchTemplate {
  id: string;
  boardTitle: string;
  transportSummary: string;
  baudRate: string;
  hardwarePins: string;
  summary: string;
  libraries: string[];
  code: string;
}

export const ARDUINO_SKETCHES: ArduinoSketchTemplate[] = [
  {
    id: 'esp32-ble-chrome',
    boardTitle: 'ESP32 Chrome BLE (13 Compartments + Dish Sensor)',
    transportSummary: 'Nordic UART BLE (6E400001-B5A3-F393-E0A9-E50E24D4CCA9) + 115200 Serial',
    baudRate: '115200',
    hardwarePins: 'Servo GPIO 13 · Stepper/Mux · HX711 DT GPIO 4 / SCK GPIO 5',
    summary:
      'Chrome-compatible ESP32 BLE sketch with mandatory BLE2902 descriptor, non-blocking millis() pill drop by pill count (DROP:<slot>:<pills>), 13 compartments, timezone clock sync, and HX711 dish weight sensor.',
    libraries: ['BLEDevice (ESP32 Core)', 'ESP32Servo', 'HX711'],
    code: `// DoseCompass ESP32 Firmware — 13 Compartments + Chrome BLE + Dish Weight Sensor
// Compatible with Chrome Web Bluetooth (Nordic UART) and 115200 USB Serial
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ESP32Servo.h>
#include "HX711.h"

#define SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24d4cca9"
#define RX_UUID      "6e400002-b5a3-f393-e0a9-e50e24d4cca9"
#define TX_UUID      "6e400003-b5a3-f393-e0a9-e50e24d4cca9"

const int SERVO_PIN = 13;
const int HX711_DOUT = 4;
const int HX711_SCK  = 5;
const int TOTAL_SLOTS = 13;

Servo chuteServo;
HX711 scale;

BLECharacteristic* pTxChar = nullptr;
bool deviceConnected = false;
bool oldDeviceConnected = false;

String cmdQueue = "";
bool isDropping = false;
unsigned long dropStartMs = 0;
int activeSlot = 0;
int pillsRemainingInDrop = 0;
bool servoOpen = false;

// Timezone-synced clock
unsigned long baseEpochUtc = 0;
long tzOffsetSeconds = 0;
unsigned long baseMillis = 0;
bool clockSynced = false;

unsigned long lastDishBroadcastMs = 0;

void sendLine(const String& msg) {
  String out = msg + "\\n";
  Serial.print(out);
  if (deviceConnected && pTxChar != nullptr) {
    // Send <=20 byte chunks so Chrome BLE never drops frames
    for (unsigned int i = 0; i < out.length(); i += 20) {
      String part = out.substring(i, min((unsigned int)out.length(), i + 20));
      pTxChar->setValue(part.c_str());
      pTxChar->notify();
      delay(8);
    }
  }
}

void reportDishWeight() {
  float grams = 0.0;
  if (scale.wait_ready_timeout(120)) {
    grams = max(0.0f, scale.get_units(2));
  }
  String state = (grams >= 0.08) ? "PILL_DETECTED" : "EMPTY";
  sendLine("DISH:" + String(grams, 2) + ":" + state);
}

void startDrop(int slot, int pillCount) {
  if (slot < 1 || slot > TOTAL_SLOTS) {
    sendLine("ERR:INVALID_SLOT");
    return;
  }
  if (isDropping) {
    sendLine("ERR:BUSY");
    return;
  }
  activeSlot = slot;
  pillsRemainingInDrop = max(1, pillCount);
  // Map 13 slots across 0..180 deg (replace with stepper angle if using 360 deg carousel)
  int angle = map(slot, 1, TOTAL_SLOTS, 12, 168);
  chuteServo.write(angle);
  servoOpen = true;
  isDropping = true;
  dropStartMs = millis();
  sendLine("ACK:DROP:" + String(slot) + ":" + String(pillsRemainingInDrop));
}

void updateDropStateMachine() {
  if (!isDropping) return;
  unsigned long elapsed = millis() - dropStartMs;

  if (servoOpen && elapsed >= 650) {
    chuteServo.write(0);
    servoOpen = false;
    dropStartMs = millis();
  } else if (!servoOpen && elapsed >= 450) {
    pillsRemainingInDrop--;
    if (pillsRemainingInDrop > 0) {
      int angle = map(activeSlot, 1, TOTAL_SLOTS, 12, 168);
      chuteServo.write(angle);
      servoOpen = true;
      dropStartMs = millis();
    } else {
      isDropping = false;
      sendLine("DROPPED:" + String(activeSlot));
      activeSlot = 0;
      reportDishWeight();
    }
  }
}

void processCmd(String line) {
  line.trim();
  if (line.length() == 0) return;

  if (line.startsWith("DROP:")) {
    // Format: DROP:<slot>:<pillCount> or DROP:<slot>
    int secondColon = line.indexOf(':', 5);
    int slot = (secondColon > 0) ? line.substring(5, secondColon).toInt() : line.substring(5).toInt();
    int pills = (secondColon > 0) ? line.substring(secondColon + 1).toInt() : 1;
    startDrop(slot, pills);
  }
  else if (line.startsWith("TIME:")) {
    int p1 = line.indexOf(':', 5);
    int p2 = line.indexOf(':', p1 + 1);
    if (p1 > 0 && p2 > p1) {
      baseEpochUtc = strtoul(line.substring(5, p1).c_str(), NULL, 10);
      tzOffsetSeconds = line.substring(p1 + 1, p2).toInt() * 60L;
      baseMillis = millis();
      clockSynced = true;
      sendLine("ACK:TIME:" + line.substring(p2 + 1));
    }
  }
  else if (line.startsWith("DELAY:")) {
    sendLine("ACK:" + line);
  }
  else if (line == "TARE") {
    if (scale.is_ready()) scale.tare();
    sendLine("ACK:TARE");
    reportDishWeight();
  }
  else if (line == "READ_DISH") {
    reportDishWeight();
  }
  else if (line == "HOME") {
    chuteServo.write(0);
    isDropping = false;
    servoOpen = false;
    sendLine("ACK:HOME");
  }
  else if (line == "PING") {
    sendLine("PONG");
  }
}

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override { deviceConnected = true; }
  void onDisconnect(BLEServer* pServer) override { deviceConnected = false; }
};

class RxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) override {
    String rx = pChar->getValue().c_str();
    cmdQueue += rx;
  }
};

void setup() {
  Serial.begin(115200);
  chuteServo.attach(SERVO_PIN);
  chuteServo.write(0);

  scale.begin(HX711_DOUT, HX711_SCK);
  scale.set_scale(420.0); // Calibrate factor for your dish load cell
  if (scale.is_ready()) scale.tare();

  BLEDevice::init("DoseCompass-ESP32");
  BLEServer* pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);
  pTxChar = pService->createCharacteristic(
    TX_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pTxChar->addDescriptor(new BLE2902()); // Required for Chrome startNotifications()

  BLECharacteristic* pRxChar = pService->createCharacteristic(
    RX_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
  pRxChar->setCallbacks(new RxCallbacks());

  pService->start();
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // Improves Chrome / macOS / Windows BLE discovery
  BLEDevice::startAdvertising();
  Serial.println("READY:ESP32_CHROME_BLE");
}

void loop() {
  updateDropStateMachine();

  if (!deviceConnected && oldDeviceConnected) {
    delay(250);
    BLEDevice::startAdvertising();
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  // Drain BLE RX queue
  int nl = cmdQueue.indexOf('\\n');
  while (nl >= 0) {
    String line = cmdQueue.substring(0, nl);
    cmdQueue = cmdQueue.substring(nl + 1);
    processCmd(line);
    nl = cmdQueue.indexOf('\\n');
  }

  // Also read 115200 USB Serial
  while (Serial.available()) {
    String sLine = Serial.readStringUntil('\\n');
    processCmd(sLine);
  }

  // Push dish weight reading every 1.5 seconds when connected
  if (deviceConnected && millis() - lastDishBroadcastMs >= 1500) {
    lastDishBroadcastMs = millis();
    reportDishWeight();
  }
}
`,
  },
  {
    id: 'esp32-mqtt-longdistance',
    boardTitle: 'ESP32 Long-Distance WiFi + MQTT (13 Slots)',
    transportSummary: 'MQTT over WiFi (topic: dosecompass/esp32-01/rx & /tx & /dish)',
    baudRate: '115200',
    hardwarePins: 'Servo GPIO 13 · HX711 DT GPIO 4 / SCK GPIO 5',
    summary:
      'Long-distance remote control over WiFi & MQTT using the exact same DoseCompass command protocol (DROP:<slot>:<pills>, TIME:..., DELAY:..., TARE, READ_DISH).',
    libraries: ['WiFi (ESP32)', 'PubSubClient', 'ESP32Servo', 'HX711'],
    code: `// DoseCompass ESP32 Long-Distance MQTT Firmware — 13 Compartments + Dish Sensor
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include "HX711.h"

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* MQTT_HOST = "broker.hivemq.com";
const int   MQTT_PORT = 1883; // ESP32 uses TCP 1883; web app uses WSS 8884 on same broker

const char* TOPIC_RX   = "dosecompass/esp32-01/rx";
const char* TOPIC_TX   = "dosecompass/esp32-01/tx";
const char* TOPIC_DISH = "dosecompass/esp32-01/dish";

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
Servo chuteServo;
HX711 scale;

void publishLine(const String& msg) {
  Serial.println(msg);
  if (mqtt.connected()) {
    mqtt.publish(TOPIC_TX, msg.c_str());
  }
}

void reportDish() {
  float g = scale.is_ready() ? max(0.0f, scale.get_units(3)) : 0.0f;
  String state = (g >= 0.08) ? "PILL_DETECTED" : "EMPTY";
  String payload = "DISH:" + String(g, 2) + ":" + state;
  Serial.println(payload);
  if (mqtt.connected()) {
    mqtt.publish(TOPIC_DISH, payload.c_str());
  }
}

void handleCommand(String cmd) {
  cmd.trim();
  if (cmd.startsWith("DROP:")) {
    int c2 = cmd.indexOf(':', 5);
    int slot = (c2 > 0) ? cmd.substring(5, c2).toInt() : cmd.substring(5).toInt();
    int pills = (c2 > 0) ? cmd.substring(c2 + 1).toInt() : 1;
    if (slot >= 1 && slot <= 13) {
      publishLine("ACK:DROP:" + String(slot) + ":" + String(pills));
      int angle = map(slot, 1, 13, 12, 168);
      for (int p = 0; p < max(1, pills); p++) {
        chuteServo.write(angle);
        delay(550);
        chuteServo.write(0);
        delay(350);
      }
      publishLine("DROPPED:" + String(slot));
      reportDish();
    } else {
      publishLine("ERR:INVALID_SLOT");
    }
  } else if (cmd.startsWith("TIME:")) {
    publishLine("ACK:TIME:OK");
  } else if (cmd.startsWith("DELAY:")) {
    publishLine("ACK:" + cmd);
  } else if (cmd == "TARE") {
    if (scale.is_ready()) scale.tare();
    publishLine("ACK:TARE");
    reportDish();
  } else if (cmd == "READ_DISH") {
    reportDish();
  } else if (cmd == "HOME") {
    chuteServo.write(0);
    publishLine("ACK:HOME");
  } else if (cmd == "PING") {
    publishLine("PONG");
  }
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  handleCommand(msg);
}

void ensureMqtt() {
  while (!mqtt.connected()) {
    String clientId = "dosecompass-esp32-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    if (mqtt.connect(clientId.c_str())) {
      mqtt.subscribe(TOPIC_RX);
      publishLine("STATUS:MQTT_ONLINE");
    } else {
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  chuteServo.attach(13);
  chuteServo.write(0);
  scale.begin(4, 5);
  scale.set_scale(420.0);
  if (scale.is_ready()) scale.tare();

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(300);

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
}

unsigned long lastDishMs = 0;

void loop() {
  if (!mqtt.connected()) ensureMqtt();
  mqtt.loop();

  if (Serial.available()) {
    handleCommand(Serial.readStringUntil('\\n'));
  }

  if (millis() - lastDishMs >= 5000) {
    lastDishMs = millis();
    reportDish();
  }
}
`,
  },
];
