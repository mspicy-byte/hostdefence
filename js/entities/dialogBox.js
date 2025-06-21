export function makeDialogBox(p, x, y) {
  return {
    x,
    y,
    text: "",
    visible: true,
    textSize: 16,
    lines: [],
    fullText: "",
    currentCharIndex: 0,
    typing: false,
    lastCharTime: 0,
    typingSpeed: 30, // ms per character
    callback: null,

    load(p) {
      // No assets to load for dialogBox, but method is here for consistency
    },

    setVisibility(state) {
      this.visible = state;
    },

    clearText() {
      this.text = "";
      this.lines = [];
      this.typing = false;
    },

    displayText(fullText, callback) {
      return new Promise((resolve) => {
        this.fullText = fullText;
        this.text = "";
        this.lines = [];
        this.currentCharIndex = 0;
        this.typing = true;
        this.lastCharTime = performance.now();
    
        // When the typing is done, resolve the promise and call the optional callback
        this.callback = () => {
          if (callback) callback();
          resolve();
        };
      });
    },
    

    displayTextImmediately(text) {
      this.text = text;
      this.lines = this.text.split("\n");
      this.typing = false;
    },

    update() {
      if (this.typing) {
        const now = performance.now();
        if (now - this.lastCharTime >= this.typingSpeed) {
          if (this.currentCharIndex < this.fullText.length) {
            this.text += this.fullText[this.currentCharIndex];
            this.currentCharIndex++;
            this.lines = this.text.split("\n");
            this.lastCharTime = now;
          } else {
            this.typing = false;
            if (this.callback) {
              setTimeout(this.callback, 50); // small delay before continuing
            }
          }
        }
      }
    },

    draw() {
      if (!this.visible) return;

      p.fill(255);
      p.stroke(0);
      p.strokeWeight(3);
      p.rect(this.x, this.y, 512, 96);

      p.fill(0);
      p.noStroke();
      p.textSize(this.textSize);
      for (let i = 0; i < this.lines.length; i++) {
        p.text(this.lines[i], this.x + 10, this.y + 25 + i * 20);
      }
    }
  };
}

  
  