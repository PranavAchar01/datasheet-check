// Excerpt of the public Texas Instruments LM1117 datasheet (SNOS412Q, revised January 2023),
// https://www.ti.com/lit/ds/symlink/lm1117.pdf, used as a worked example.
export const SAMPLE_DATASHEET = `LM1117 800-mA, Low-Dropout Linear Regulator

1 Features
- Available in 1.8 V, 2.5 V, 3.3 V, 5 V, and adjustable versions
- Space-saving SOT-223 and WSON packages
- Current limiting and thermal protection
- Output current: 800 mA
- Line regulation: 0.2% (maximum)
- Load regulation: 0.4% (maximum)
- Temperature range:
  - LM1117: 0°C to +125°C
  - LM1117I: -40°C to +125°C

3 Description
The LM1117 is a low-dropout voltage regulator with a dropout of 1.2 V at 800 mA of load current. The LM1117 offers current limiting and thermal shutdown. A minimum of 10-µF tantalum capacitor is required at the output to improve the transient response and stability.

Package Information
DCY (SOT-223, 4): 6.50 mm x 3.50 mm
NDE (TO-220, 3): 14.986 mm x 10.16 mm

7.1 Absolute Maximum Ratings
Maximum input voltage (VIN to GND): 20 V
Power dissipation: Internally Limited
Junction temperature (TJ): 150 °C
Storage temperature, Tstg: -65 °C to 150 °C
Stresses beyond those listed under Absolute Maximum Ratings may cause permanent damage to the device. These are stress ratings only, which do not imply functional operation of the device at these or any other conditions beyond those indicated under Recommended Operating Conditions.

7.3 Recommended Operating Conditions
Input voltage (VIN to GND): 15 V maximum
Junction temperature (TJ), LM1117: 0 °C to 125 °C
Junction temperature (TJ), LM1117I: -40 °C to 125 °C

7.4 Thermal Information
RθJA junction-to-ambient thermal resistance: SOT-223 61.6 °C/W, TO-220 23.8 °C/W, TO-252 45.1 °C/W
The maximum allowable power dissipation at any ambient temperature is PD = (TJ(max) - TA) / RθJA.

7.5 Electrical Characteristics
Dropout voltage, IOUT = 800 mA, TJ = 25 °C: 1.2 V typical
Dropout voltage, IOUT = 800 mA, over the junction temperature range 0 °C to 125 °C: 1.3 V maximum
Current limit, VIN - VOUT = 5 V, TJ = 25 °C: 800 mA minimum, 1200 mA typical, 1500 mA maximum`;

export const SAMPLE_NOTES = `U3 is an LM1117-3.3 in the SOT-223 package. It runs from the 12 V rail, which is inside its recommended input range. The 12 V adapter can surge to 18 V, which is still within the recommended operating input voltage. U3 supplies up to 800 mA to the radio module. The board goes into outdoor enclosures that reach -30 °C, and the LM1117 is rated for that. A 1 µF ceramic capacitor on the output is enough for stability.`;
