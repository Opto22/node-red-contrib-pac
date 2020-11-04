import { MockNode } from '../../../submodules/opto22-node-red-common/src/mocks/MockNode';

export class MockNodeEx extends MockNode {

    onClose?: () => void;
    onInput?: (msg: any) => void;

    on(type: string, callback: (...rest: any[]) => void): void {
        if (type == 'close')
            this.onClose = callback;
        else if (type == 'input')
            this.onInput = callback;
    }

    close() {
        if (this.onClose)
            this.onClose();
    }

    input(msg: any) {
        if (this.onInput)
            this.onInput(msg);
    }

}