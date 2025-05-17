const screenHeight = 480;
const screenWidth = 640;
const timeBeforeZombieMs = 60000;
const timeBeforeContaminationMs = 30000;

class GameScreen {
    public deadPixels:[number, number, number][] = [];
    public zombiePixels:[number, number, number][] = [];
    public grid = [];

    public addDeadPixels(x:number, y:number) {
        this.deadPixels.push([x, y, new Date().getMilliseconds() + timeBeforeZombieMs]);
        // todo remove from zombie if it was a zombie
        const zombieToRemove = this.zombiePixels.findIndex((value) => value[0] === x && value[1] === y);
        if(zombieToRemove >= 0){ 
            this.zombiePixels.splice(zombieToRemove, 1);
        }
    }

    public contaminatePixels(x:number, y:number) {
        if(x >=0 &&
            x < screenWidth &&
            y >=0 &&
            y < screenHeight &&
            this.zombiePixels.findIndex((value) => value[0] === x && value[1] === y) < 0) {
                this.deadPixels.push([x, y, new Date().getMilliseconds() + timeBeforeZombieMs]);
        }
    }

    public updatePixelsLifeCycle() {
        // change deadPx to zombie
        this.deadPixels.forEach((deadPixel) => {
            const deadPixelToRemoveIndexes = [];
            if(new Date().getMilliseconds() > deadPixel[2]){
                this.zombiePixels.push([deadPixel[0], deadPixel[1], new Date().getMilliseconds() + timeBeforeContaminationMs]);
                deadPixelToRemoveIndexes.push(this.deadPixels.indexOf(deadPixel, 0));
            }
            deadPixelToRemoveIndexes.forEach(index => this.deadPixels.splice(index, 1));
        });

        // zombie contamination 
        this.zombiePixels.forEach((zombiePixel) => {
            if(new Date().getMilliseconds() > zombiePixel[2]){
                this.contaminatePixels(zombiePixel[0]+1, zombiePixel[1]);
                this.contaminatePixels(zombiePixel[0]-1, zombiePixel[1]);
                this.contaminatePixels(zombiePixel[0], zombiePixel[1]+1);
                this.contaminatePixels(zombiePixel[0], zombiePixel[1]-1);
            }
        });
    }

    // todo generate array for screen from pixels 
}