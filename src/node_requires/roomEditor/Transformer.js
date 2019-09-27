const TransformHandle = require('./TransformHandle');
const trigo = require('./../trigo');
const everywhere = {
    contains() {
        return true;
    }
};

class Transformer extends PIXI.Container {
    constructor(items) {
        if (!items || !items.length) {
            throw new Error('Cannot create a Tramsformer with no items.');
        }
        super();
        this.x = this.y = 1;
        this.items = items;
        this.drag = false;
        this.interactive = true;
        this.hitArea = everywhere; // set a custom hit area so we can detect clicks outside the transform frame

        /* Copy transforms so we don't get misalignment
        due to layered deltas after transforming at each frame */
        this.sourceTransforms = items.map(item => {
            const t = new PIXI.Matrix();
            t.copyFrom(item.localTransform);
            return t;
        });
        this.outline = new PIXI.Graphics();
        this.rotHandle = new TransformHandle('grab');
        this.moveHandle = new TransformHandle('move');
        this.scaleXHandle = new TransformHandle('ew-resize');
        this.scaleYHandle = new TransformHandle('ns-resize');
        this.scaleXYHandle = new TransformHandle('nwse-resize');
        this.handles = [this.rotHandle, this.scaleXHandle, this.scaleYHandle, this.scaleXYHandle, this.moveHandle];
        this.addChild(this.outline, ...this.handles);
        this.realign();

        this.on('pointerdown', this.deleteSelf);
        for (const handle of this.handles) {
            handle.on('pointerdown', this.captureMouseDown.bind(this));
        }
        this.on('pointermove', this.updateState);
        this.on('pointerup', this.stopDragging);
    }
    realign() {
        let bbox;
        for (const item of this.items) {
            const ibbox = item.getLocalBounds();
            ibbox.x += item.x;
            ibbox.y += item.y;
            if (!bbox) {
                bbox = new PIXI.Rectangle(0, 0, 0, 0);
                bbox.copyFrom(ibbox);
            } else {
                bbox.enlarge(ibbox);
            }
        }
        // Position itself so the pivot is placed at the center of the selection.
        this.x = bbox.x + bbox.width / 2;
        this.y = bbox.y + bbox.height / 2;

        this.outline.clear();
        this.outline
        .lineStyle(3, 0x446adb)
        .drawRoundedRect(-bbox.width / 2 - 0.5, -bbox.height / 2 - 0.5, bbox.width + 1, bbox.height + 1, 0.1);
        this.outline
        .lineStyle(1, 0xffffff)
        .drawRoundedRect(-bbox.width / 2 - 0.5, -bbox.height / 2 - 0.5, bbox.width + 1, bbox.height + 1, 0.1);

        this.moveHandle.x = this.scaleYHandle.x = 0;
        this.moveHandle.y = this.scaleXHandle.y = this.rotHandle.y = 0;
        this.scaleXYHandle.x = this.scaleXHandle.x = bbox.width / 2;
        this.scaleXYHandle.y = this.scaleYHandle.y = bbox.height / 2;
        this.rotHandle.x = bbox.width / 2 + 32;

        this.selectionBounds = bbox;
    }
    deleteSelf() {
        this.parent.removeChild(this);
    }
    captureMouseDown(e) {
        this.previousLocalTransform = this.localTransform.clone();
        this.previousRotation = this.rotation;
        this.drag = {
            fromX: e.data.global.x,
            fromY: e.data.global.y,
            target: e.currentTarget
        };
        e.stopPropagation();
    }
    updateState(e) {
        //console.log(this.drag, e);
        if (!this.drag) {
            return;
        }
        this.drag.toX = e.data.global.x;
        this.drag.toY = e.data.global.y;

        if (this.drag.target === this.rotHandle) {
            const globPos = this.getGlobalPosition();
            const from = trigo.pdnRad(globPos.x, globPos.y, this.drag.fromX, this.drag.fromY),
                  to = trigo.pdnRad(globPos.x, globPos.y, this.drag.toX, this.drag.toY);
            let delta = trigo.deltaDirRad(from, to);
            if (this.state.shift) {
                delta = trigo.degToRad(Math.round(trigo.radToDeg(delta) / 15) * 15);
            }
            this.rotation = this.previousRotation + delta;
        }
    }
    stopDragging(e) {
        this.drag = false;
    }
}

module.exports = Transformer;
