/*
gamepad package
*/
//% weight=10 icon="\uf11b" color=#d736ff block="Handlebit Controller" 
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

    export enum Direction {
        //% block="X"
        DIR_X,
        //% block="Y"
        DIR_Y
    }


    export enum Joystick {
        //% block="links"
        JOYSTICK_LEFT,
        //% block="rechts"
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
                    //converting values to range [-100;100]
                    JoystickX1 = Math.floor(((128 - argsInt)*2-1)*100/255);

                    args = cmd.substr(3, 2);
                    argsInt = strToNumber(args);
                    if (argsInt == -1) {
                        handleCmd = "";
                        return;
                    }
                    JoystickY1 = Math.floor(((argsInt-128)*2+1)*100/255);

                    args = cmd.substr(5, 2);
                    argsInt = strToNumber(args);
                    if (argsInt == -1) {
                        handleCmd = "";
                        return;
                    }
                    JoystickX2 = Math.floor(((128 - argsInt)*2-1)*100/255);

                    args = cmd.substr(7, 2);
                    argsInt = strToNumber(args);
                    if (argsInt == -1) {
                        handleCmd = "";
                        return;
                    }
                    JoystickY2 = Math.floor(((argsInt-128)*2+1)*100/255);
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
     * Die Werte liegen im Bereich -100 bis 100.
     */
    //% weight=84 blockId=handle_getHandleSensorValue block="|%direction|-Wert von Joystick |%joystick|"
    export function handle_getHandleSensorValue(joystick: Joystick, direction: Direction): number {
        let value: number = 0;
        if (joystick == Joystick.JOYSTICK_LEFT){
            if (direction == Direction.DIR_X) {
                value = JoystickX1;
            }
            else {
                value = JoystickY1;
            }
        }
        else {
            if (direction == Direction.DIR_X) {
                value = JoystickX2;
            }
            else {
                value = JoystickY2;
            }
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
     * Die Werte liegen im Bereich 0 bis 360 Grad.
     */
    //% blockId=calculateAngle block="Winkel Joystick |%joystick|"
    export function calculateAngle(joystick: Joystick) : number {
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
            value = Math.round(Math.atan2(yWert,xWert)/Math.PI*180)+180;
    return value;
    }

    /**
     * Berechnet die Auslenkung des gewünschten Joystick.
     * Die Werte liegen im Bereich -100 bis 100.
     */
    //% blockId=calculateDeflection block="Auslenkung Jostick |%joystick|"
    export function calculateDeflection(joystick: Joystick): number {
        let value: number = 0;
        let x = 0;
        let y = 0;
        if (joystick == Joystick.JOYSTICK_LEFT) {
            x = JoystickX1;
            y = JoystickY1;
        }
        else {
            x = JoystickX2;
            y = JoystickY2;
        }
        // adding 0.1 in case both x and y are 0
        value = Math.round(Math.sqrt(x*x+y*y+0.1));
        if (value > 100)
        {
            value=100;
        }
        return value;
    }
}
