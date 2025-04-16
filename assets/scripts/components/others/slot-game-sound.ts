import { _decorator, AudioSource, Component } from "cc";
const { ccclass, property } = _decorator;

@ccclass
export default class SlotGameSound extends Component {
    soundSources = {};

    onLoad() {
        this.node.children.forEach((node) => {
            this.soundSources[node.name] = node.getComponent(AudioSource);
        });
    }

    playSound(type: any) {
        // this.soundSources[type] && AudioManager.getInstance().playSFXSource(this.soundSources[type]);
    }

    stopSound(type: any) {
        // this.soundSources[type].stop();
    }
}
