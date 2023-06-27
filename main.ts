/*
gamepad package
*/
//% weight=10 icon="\uf11b" color=#2896ff block="Handlebit Controller" 
namespace handlebit_controller {
    export enum HandleButton {
        //% block="B1"
        B1 = EventBusValue.MES_DPAD_BUTTON_2_DOWN,
        //% block="B2"
        B2 = EventBusValue.MES_DPAD_BUTTON_3_DOWN,
        //% block="Joystick links"
        JOYSTICK1 = EventBusValue.MES_DPAD_BUTTON_B_DOWN,
        //% block="Joystick rechts"
        JOYSTICK2 = EventBusValue.MES_DPAD_BUTTON_C_DOWN
    }

    export enum HandleSensorValue {
        //% block="Joystick links X"
        JOYSTICK_X1,
        //% block="Joystick links Y"
        JOYSTICK_Y1,
        //% block="Joystick rechts X"
        JOYSTICK_X2,
        //% block="Joystick rechts Y"
        JOYSTICK_Y2
    }

    export enum Joystick {
        //% block="Joystick links"
        JOYSTICK_LEFT,
        //% block="Joystick rechts"
        JOYSTICK_RIGHT
    }

    let JoystickX1: number = -1;
    let JoystickX2: number = -1;
    let JoystickY1: number = -1;
    let JoystickY2: number = -1;
    let handleCmd: string = "";

    /**
       * Dieser Block muss beim Start einmal ausgeführt werden um den Handlebit zu initialisieren
      */
    //% weight=100 blockId=handlebitInit block="Handlebit Initialisierung"
    export function handlebitInit() {
        serial.redirect(
            SerialPin.P12,
            SerialPin.P8,
            BaudRate.BaudRate115200);
        control.waitMicros(50);
        let buf = pins.createBuffer(4);
        buf[0] = 0x55;
        buf[1] = 0x55;
        buf[2] = 0x02;
        buf[3] = 0x5A;//cmd type
        serial.writeBuffer(buf);
        basic.forever(() => {
            getHandleCmd();
        });
    }


    /**
     * Get the handle command.
     */
    function getHandleCmd() {
        let charStr: string = serial.readString();
        handleCmd = handleCmd.concat(charStr);
        let cnt: number = countChar(handleCmd, "$");
        let startIndex: number = 0;
        if (cnt == 0)
            return;
        for (let i = 0; i < cnt; i++) {
            let index = findIndexof(handleCmd, "$", startIndex);
            if (index != -1) {
                let cmd: string = handleCmd.substr(startIndex, index - startIndex);
                if (cmd.charAt(0).compare("K") == 0 && cmd.length < 9) {
                    for (let j = 0; j < cmd.length - 1; j++) {
                        let args: string = cmd.substr(1 + j, 1);
                        let argsInt: number = strToNumber(args);
                        if (argsInt == -1) {
                            handleCmd = "";
                            return;
                        }
                        switch (argsInt) {
                            case 1:
                                control.raiseEvent(EventBusSource.MES_DPAD_CONTROLLER_ID, HandleButton.B1);
                                break;

                            case 3:
                                control.raiseEvent(EventBusSource.MES_DPAD_CONTROLLER_ID, HandleButton.B2);
                                break;

                            case 5:
                                control.raiseEvent(EventBusSource.MES_DPAD_CONTROLLER_ID, HandleButton.JOYSTICK1);
                                break;

                            case 7:
                                control.raiseEvent(EventBusSource.MES_DPAD_CONTROLLER_ID, HandleButton.JOYSTICK2);
                                break;

                            default:
                                break;
                        }
                    }
                }
                else if (cmd.charAt(0).compare("J") == 0 && cmd.length == 9) {
                    let args: string = cmd.substr(1, 2);
                    let argsInt: number = strToNumber(args);
                    if (argsInt == -1) {
                        handleCmd = "";
                        return;
                    }
                    JoystickX1 = (128 - argsInt)*2-1;

                    args = cmd.substr(3, 2);
                    argsInt = strToNumber(args);
                    if (argsInt == -1) {
                        handleCmd = "";
                        return;
                    }
                    JoystickY1 = (argsInt-128)*2+1;

                    args = cmd.substr(5, 2);
                    argsInt = strToNumber(args);
                    if (argsInt == -1) {
                        handleCmd = "";
                        return;
                    }
                    JoystickX2 = (128 - argsInt)*2-1;

                    args = cmd.substr(7, 2);
                    argsInt = strToNumber(args);
                    if (argsInt == -1) {
                        handleCmd = "";
                        return;
                    }
                    JoystickY2 = (argsInt-128)*2+1;
                }
                startIndex = index + 1;
            }

        }
        if (cnt > 0) {
            handleCmd = "";
        }
    }

    function findIndexof(src: string, strFind: string, startIndex: number): number {
        for (let i = startIndex; i < src.length; i++) {
            if (src.charAt(i).compare(strFind) == 0) {
                return i;
            }
        }
        return -1;
    }

    function countChar(src: string, strFind: string): number {
        let cnt: number = 0;
        for (let i = 0; i < src.length; i++) {
            if (src.charAt(i).compare(strFind) == 0) {
                cnt++;
            }
        }
        return cnt;
    }

    /**
     * Do something when a button is pushed down and released again.
     * @param button the button that needs to be pressed
     * @param body code to run when event is raised
     */
    //% weight=86 blockId=onHandleButtonPressed block="wenn Knopf |%button|gedrückt"
    export function onHandleButtonPressed(button: HandleButton, body: Action) {
        control.onEvent(EventBusSource.MES_DPAD_CONTROLLER_ID, button, body);
    }

    /**
     * Liest den Wert des gewünschten Joystick in die gewünschte Richtung.
     */
    //% weight=84 blockGap=50 blockId=handle_getHandleSensorValue block="|%type|Sensorwert (-255 bis 255)"
    export function handle_getHandleSensorValue(type: HandleSensorValue): number {
        let value: number = 0;
        switch (type) {
            case HandleSensorValue.JOYSTICK_X1: value = JoystickX1; break;
            case HandleSensorValue.JOYSTICK_Y1: value = JoystickY1; break;
            case HandleSensorValue.JOYSTICK_X2: value = JoystickX2; break;
            case HandleSensorValue.JOYSTICK_Y2: value = JoystickY2; break;
        }
        return value;
    }

    function strToNumber(str: string): number {
        let num: number = 0;
        for (let i = 0; i < str.length; i++) {
            let tmp: number = converOneChar(str.charAt(i));
            if (tmp == -1)
                return -1;
            if (i > 0)
                num *= 16;
            num += tmp;
        }
        return num;
    }

    function converOneChar(str: string): number {
        if (str.compare("0") >= 0 && str.compare("9") <= 0) {
            return parseInt(str);
        }
        else if (str.compare("A") >= 0 && str.compare("F") <= 0) {
            if (str.compare("A") == 0) {
                return 10;
            }
            else if (str.compare("B") == 0) {
                return 11;
            }
            else if (str.compare("C") == 0) {
                return 12;
            }
            else if (str.compare("D") == 0) {
                return 13;
            }
            else if (str.compare("E") == 0) {
                return 14;
            }
            else if (str.compare("F") == 0) {
                return 15;
            }
            return -1;
        }
        else
            return -1;
    }
    
     /**
     * Berechnet den Winkelwert des gewünschten Joystick.
     */
    //% weight=84 blockGap=50 blockId=winkelBerechnen block="Winkel |%joystick|"
    export function winkelBerechnen(joystick: Joystick) : number {
        let value: number = 0;
        let xWert=0;
        let yWert=0;
        if (joystick == Joystick.JOYSTICK_LEFT)
        {
            xWert=JoystickX1;
            yWert=JoystickY1;
        }
        else {
            xWert=JoystickX2;
            yWert=JoystickY2;
        }
            value = Math.atan2(yWert,xWert)/Math.PI*180+180;
    return value;
    }
}
