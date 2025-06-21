import { makeMenu } from "./menu.js";
import { makeBattle } from "./battle.js";

new p5((p) => {
  let font;
  const scenes = ["menu", "battle"];
  let currentScene = "menu";
  function setScene(name) {
    if (scenes.includes(name)) {
      currentScene = name;
    }
  }

  const menu = makeMenu(p);
  const battle = makeBattle(p);

  p.preload = () => {
    font = p.loadFont("./assets/power-clear.ttf");
    menu.load();
    battle.load();
  };

  p.setup = () => {
    const canvasEl = p.createCanvas(512, 384, document.getElementById("game"));
    // make canvas sharper temporarly
    p.pixelDensity(3);
    canvasEl.canvas.style = "";

    p.textFont(font);
    p.noSmooth(); // for pixels to not become blurry

    battle.setup();
  };

  p.draw = () => {
    switch (currentScene) {
      case "menu":
        menu.update();
        menu.draw();
        break;
      case "battle":
        battle.update();
        battle.draw();
        break;
      default:
    }
  };

  p.keyPressed = (keyEvent) => {
    if (keyEvent.keyCode === p.ENTER && currentScene === "menu") {
      setScene("battle");
      
    }
  
    if (currentScene === "battle") {
      battle.onKeyPressed(keyEvent);
    }
  };

  
  
});

// UI logic for category -> subattack dropdowns
document.addEventListener("DOMContentLoaded", () => {
    const categoryButtons = document.querySelectorAll(".category-button");
  
    categoryButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const subMenu = button.nextElementSibling;
  
        // Close all other open submenus
        document.querySelectorAll(".subcategory").forEach((menu) => {
          if (menu !== subMenu) menu.classList.add("hidden");
        });
  
        // Toggle clicked submenu
        subMenu.classList.toggle("hidden");
      });
    });
});
  