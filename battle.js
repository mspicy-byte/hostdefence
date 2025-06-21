import { makeDialogBox } from "./entities/dialogBox.js";

let bacteriaData = [];

async function loadBacteriaData() {
  try {
    const response = await fetch('data/BacteriaData.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const json = await response.json();
    bacteriaData = json;
    console.log("Bacteria Data Loaded:", bacteriaData);
  } catch (error) {
    console.error("Error loading bacteria data:", error);
  }
}

const states = {
  default: "default",
  introNpc: "intro-npc",
  introNpcPokemon: "intro-npc-pokemon",
  introPlayerPokemon: "intro-player-pokemon",
  playerTurn: "player-turn",
  playerAttack: "player-attack", // New state for showing attack message and waiting for dialogBox callback
  npcTurn: "npc-turn",
  battleEnd: "battle-end",
  winnerDeclared: "winner-declared",
  postBattleChoice: "post-battle-choice", 
};

function makePokemon(name, x, finalX, y, maxHp, attacks, dataBox) {
  return {
    name,
    finalX,
    x,
    y,
    spriteRef: null,
    maxHp,
    hp: maxHp,
    attacks,
    selectedAttack: null,
    isFainted: false,
    dataBox,
    susceptibilities: {}, // Will store the loaded susceptibility data for NPC Pokemon
    isAttacking: false, // Flag to prevent multiple attack triggers
  };
}

function makeDataBox(x, y, nameX, nameY, healthBarX, healthBarY) {
  return {
    x,
    y,
    nameOffset: {
      x: nameX,
      y: nameY,
    },
    healthBarOffset: {
      x: healthBarX,
      y: healthBarY,
    },
    spriteRef: null,
    maxHealthBarLength: 96,
    healthBarLength: 96,
    
  };
}



export function makeBattle(p) {
  

  const battleInstance = { // Use a single instance variable for 'this' context
    dialogBox: makeDialogBox(p, 0, 288),
    currentState: "default",
    npcTurnInProgress: false, //edit here 
    npc: {
      x: 350,
      y: 20,
      spriteRef: null,
    },
    npcPokemon: makePokemon(
      "S. pneumoniae", // This will be overwritten by randomBacteria.name in setup
      600,
      310,
      20,
      100, // Max HP for NPC Pokemon, can be overwritten by JSON data if desired
      [ // These are placeholder attacks, actual attacks are from JSON for player. NPC attacks are still hardcoded for now.
        { name: "endotoxin", power: 5 },
        { name: "heat stable protein", power: 5 },
        { name: "bacterial secretion system", power: 5 },
        { name: "Molecular Mimicry", power: 5 },
      ],
      makeDataBox(-300, 40, 15, 30, 118, 40)
    ),
    playerPokemon: makePokemon(
      "Antibiotic steward",
      -170,
      20,
      128,
      100,
      [
        // IMPORTANT: 'name' must match JSON susceptibility keys. 'display' is for button text.
        // 'power' is a base damage value, which will be modified by susceptibility.
        { name: "amox_clav", display: "Amoxicillin", power: 10 },
        { name: "ampicillin", display: "Ampicillin", power: 10 },
        { name: "ceftriaxzone", display: "Ceftriaxone", power: 10 },
        { name: "ciprofloxacin", display: "Ciprofloxacin", power: 10 },
        { name: "levofloxacin", display: "Levofloxacin", power: 10 },
        { name: "doxycycline", display: "Tetracycline", power: 10 },
        { name: "doxycycline", display: "Doxycycline", power: 10 },
        { name: "erythromycin", display: "Azithromycin", power: 10 },
        // Ensure all possible antibiotics from your HTML buttons are listed here
        // with their corresponding `name` (JSON key) and `display` text.
        // Add more as per your full HTML structure:
        // { name: "nitrofurantoin", display: "Nitrofurantoin", power: 30 },
        // { name: "cefazolin", display: "Cefazolin", power: 40 },
        // { name: "tmp_smx", display: "TMP-SMX", power: 50 },
        // { name: "gentamycin", display: "Gentamycin", power: 55 },
        // { name: "tobramycin", display: "Tobramycin", power: 55 },
        // { name: "ertapenum", display: "Ertapenum", power: 60 },
        // { name: "meropenum", display: "Meropenum", power: 65 },
        // { name: "clindamycin", display: "Clindamycin", power: 45 },
      ],
      makeDataBox(510, 220, 38, 30, 136, 40)
    ),
    drawDataBox(pokemon) {
      p.image(pokemon.dataBox.spriteRef, pokemon.dataBox.x, pokemon.dataBox.y);
      p.text(
        pokemon.name,
        pokemon.dataBox.x + pokemon.dataBox.nameOffset.x,
        pokemon.dataBox.y + pokemon.dataBox.nameOffset.y
      );

      p.push();
      p.angleMode(p.DEGREES);
      p.noStroke();
      if (pokemon.dataBox.healthBarLength > 50) {
        p.fill(0, 200, 0); // Green
      } else if (pokemon.dataBox.healthBarLength > 20) {
        p.fill(255, 165, 0); // Orange
      } else {
        p.fill(200, 0, 0); // Red
      }
      p.rect(
        pokemon.dataBox.x + pokemon.dataBox.healthBarOffset.x,
        pokemon.dataBox.y + pokemon.dataBox.healthBarOffset.y,
        pokemon.dataBox.healthBarLength,
        6
      );
      p.pop();
    },

    async dealDamage(targetPokemon, attackingPokemon) {
      let actualDamage = 0;
      let message = "";

      // Check if the attackingPokemon is the player, as only player attacks use susceptibility
      if (attackingPokemon === battleInstance.playerPokemon) { // Use battleInstance for consistent 'this'
        const antibioticName = attackingPokemon.selectedAttack.name; // This is now the exact JSON key
        const susceptibility = targetPokemon.susceptibilities[antibioticName];

        if (typeof susceptibility === 'undefined') {
          // Fallback if the antibiotic key is not found in the JSON susceptibility data
          message = `Error: Susceptibility data for ${attackingPokemon.selectedAttack.display} not found for ${targetPokemon.name}.`;
          actualDamage = 0; // No damage
        } else if (susceptibility > 95) {
          // Super Effective
          actualDamage = attackingPokemon.selectedAttack.power *2* (susceptibility / 100);
          message = `It's super effective! ${attackingPokemon.selectedAttack.display} dealt ${Math.round(actualDamage)} damage!`;
        } else if (susceptibility < 65) {
          // Resistant
          actualDamage = 0; // No damage
          message = `${targetPokemon.name} is resistant to ${attackingPokemon.selectedAttack.display}! No damage dealt.`;
        } else {
          // Normal Effectiveness
          actualDamage = attackingPokemon.selectedAttack.power * (susceptibility / 100);
          message = `${attackingPokemon.selectedAttack.display} dealt ${Math.round(actualDamage)} damage to ${targetPokemon.name}.`;
        }
      } else {
        // NPC (bacteria) attacks, no susceptibility logic applied here
        actualDamage = attackingPokemon.selectedAttack.power;
        message = `dealt ${actualDamage} damage!`;
      }

      // Display the damage message before health bar update
      await battleInstance.dialogBox.displayText(message);

      // Apply the actual calculated damage
      targetPokemon.hp -= actualDamage;

      if (targetPokemon.hp > 0) {
        targetPokemon.dataBox.healthBarLength =
          (targetPokemon.hp * targetPokemon.dataBox.maxHealthBarLength) /
          targetPokemon.maxHp;

        await new Promise((resolve) => setTimeout(resolve, 1000));
        battleInstance.dialogBox.clearText();
        return;
      }

      // If fainted
      targetPokemon.dataBox.healthBarLength = 0;
      targetPokemon.isFainted = true;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      battleInstance.currentState = states.battleEnd;
      ;
    },

    load() {
      battleInstance.battleBackgroundImage = p.loadImage("assets/battle-background.png");
      battleInstance.npc.spriteRef = p.loadImage("assets/GENTLEMAN.png");
      battleInstance.npcPokemon.spriteRef = p.loadImage("assets/bacteria.png");
      battleInstance.playerPokemon.spriteRef = p.loadImage("assets/plague.png");
      battleInstance.playerPokemon.dataBox.spriteRef = p.loadImage(
        "assets/databox_thin.png"
      );
      battleInstance.npcPokemon.dataBox.spriteRef = p.loadImage(
        "assets/databox_thin_foe.png"
      );
      battleInstance.dialogBox.load();
    },

    initializeAttackUI() {
      const attackButtonsContainer = document.getElementById("attack-buttons");
    
      // Handle main category expansion (Penicillins, Quinolones, etc.)
      const categoryButtons = document.querySelectorAll(".category-button");
      categoryButtons.forEach(button => {
        button.addEventListener("click", () => {
          const category = button.dataset.category;
          console.log("Clicked category button:", category);
    
          // Hide all subcategories
          document.querySelectorAll(".subcategory").forEach(sub => {
            sub.classList.add("hidden");
          });
    
          // Show the clicked one
          const subcategory = document.querySelector(`.subcategory[data-category="${category}"]`);
          if (subcategory) {
            subcategory.classList.toggle("hidden");
          }
        });
      });
    
      // 🎯 THIS is the correct selector based on your HTML
      const antibioticButtons = document.querySelectorAll(".subattack");
    
      antibioticButtons.forEach(button => {
        button.addEventListener("click", () => {
          const selectedName = button.dataset.antibioticName; // ← your HTML uses 'data-antibiotic-name'
    
          const selectedAttack = battleInstance.playerPokemon.attacks.find(
            atk => atk.name === selectedName
          );
    
          if (selectedAttack) {
            console.log("Selected attack:", selectedAttack);
            battleInstance.playerPokemon.selectedAttack = selectedAttack;
            battleInstance.currentState = states.playerAttack;
    
            // Hide the UI
            attackButtonsContainer.style.display = "none";
            attackButtonsContainer.classList.add("hidden");
            battleInstance.dialogBox.clearText();
          } else {
            console.warn(`No attack found for name: ${selectedName}`);
          }
        });
      });
    },

    async setup() {
      await loadBacteriaData(); // Make sure the JSON is loaded
      battleInstance.initializeAttackUI(); // Initialize button listeners
    
      // Pick a random bacteria from the list
      const randomBacteria =
        bacteriaData[Math.floor(Math.random() * bacteriaData.length)];
    
      // Assign enemy name and store full susceptibility info
      battleInstance.npcPokemon.name = randomBacteria.name;
      battleInstance.npcPokemon.maxHp = randomBacteria.maxHP || 100;
      battleInstance.npcPokemon.hp = battleInstance.npcPokemon.maxHp;
    
      // Store ONLY the susceptibility map for later use during damage calculation
      battleInstance.npcPokemon.susceptibilities = { ...randomBacteria.susceptibility };
    
      // Load the rest of the game assets
      battleInstance.battleBackgroundImage = p.loadImage("assets/battle-background.png");
      battleInstance.npc.spriteRef = p.loadImage("assets/GENTLEMAN.png");
      battleInstance.npcPokemon.spriteRef = p.loadImage("assets/bacteria.png"); 
      battleInstance.playerPokemon.spriteRef = p.loadImage("assets/plague.png");
      battleInstance.playerPokemon.dataBox.spriteRef = p.loadImage("assets/databox_thin.png");
      battleInstance.npcPokemon.dataBox.spriteRef = p.loadImage("assets/databox_thin_foe.png");
      battleInstance.dialogBox.load();
    
      // Start intro dialog flow with await for typewriter pacing
      battleInstance.dialogBox.setVisibility(true);
    
      await battleInstance.dialogBox.displayText("Cultures were sent from your patient!");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    
      battleInstance.currentState = states.introNpc;
      battleInstance.dialogBox.clearText();
    
      await battleInstance.dialogBox.displayText(`Cultures grow ${battleInstance.npcPokemon.name} !`);
      battleInstance.currentState = states.introNpcPokemon;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      battleInstance.dialogBox.clearText();
    
      await battleInstance.dialogBox.displayText(`Go! ${battleInstance.playerPokemon.name} !`);
      battleInstance.currentState = states.introPlayerPokemon;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      battleInstance.dialogBox.clearText();
    
      await battleInstance.dialogBox.displayText(`What will ${battleInstance.playerPokemon.name} do ?`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    
      battleInstance.currentState = states.playerTurn;
    },

    update() {
      if (battleInstance.currentState === states.introNpc) {
        battleInstance.npc.x += 0.5 * p.deltaTime;
      }

      if (
        battleInstance.currentState === states.introNpcPokemon &&
        battleInstance.npcPokemon.x >= battleInstance.npcPokemon.finalX
      ) {
        battleInstance.npcPokemon.x -= 0.5 * p.deltaTime;
        if (battleInstance.npcPokemon.dataBox.x <= 0)
          battleInstance.npcPokemon.dataBox.x += 0.5 * p.deltaTime;
      }

      if (
        battleInstance.currentState === states.introPlayerPokemon &&
        battleInstance.playerPokemon.x <= battleInstance.playerPokemon.finalX
      ) {
        battleInstance.playerPokemon.x += 0.5 * p.deltaTime;
        battleInstance.playerPokemon.dataBox.x -= 0.65 * p.deltaTime;
      }

      if (battleInstance.playerPokemon.isFainted) {
        battleInstance.playerPokemon.y += 0.8 * p.deltaTime;
      }

      if (battleInstance.npcPokemon.isFainted) {
        battleInstance.npcPokemon.y += 0.8 * p.deltaTime;
      }

      battleInstance.dialogBox.update();
    },

    draw() {
      p.clear();
      p.background(0);
      p.image(battleInstance.battleBackgroundImage, 0, 0);

      p.image(battleInstance.npcPokemon.spriteRef, battleInstance.npcPokemon.x, battleInstance.npcPokemon.y);

      battleInstance.drawDataBox(battleInstance.npcPokemon);

      p.image(
        battleInstance.playerPokemon.spriteRef,
        battleInstance.playerPokemon.x,
        battleInstance.playerPokemon.y
      );

      battleInstance.drawDataBox(battleInstance.playerPokemon);

      if (
        battleInstance.currentState === states.default ||
        battleInstance.currentState === states.introNpc
      )
        p.image(battleInstance.npc.spriteRef, battleInstance.npc.x, battleInstance.npc.y);

      // Get the attack buttons container once
      const attackButtons = document.getElementById("attack-buttons");

      // Show the attack buttons when it's the player's turn and no attack is selected
      if (
        battleInstance.currentState === states.playerTurn &&
        !battleInstance.playerPokemon.selectedAttack
      ) {
        battleInstance.dialogBox.displayTextImmediately("Choose your antibiotic:");
        attackButtons.classList.remove("hidden"); // Crucial: Remove the 'hidden' class
        attackButtons.style.display = "flex"; // Ensure it's displayed as flex
      } else {
         // Hide the buttons once an attack is selected or it's not player turn
         attackButtons.style.display = "none";
         // Optional: Add back the 'hidden' class if you want CSS to manage initial state
         // attackButtons.classList.add("hidden");
      }

      // Handle the player's attack animation and damage dealing
      if (
        battleInstance.currentState === states.playerAttack &&
        battleInstance.playerPokemon.selectedAttack &&
        !battleInstance.playerPokemon.isAttacking &&
        !battleInstance.playerPokemon.isFainted
      ) {
        battleInstance.playerPokemon.isAttacking = true;
        battleInstance.dialogBox.clearText();
      
        (async () => {
          await battleInstance.dialogBox.displayText(
            `${battleInstance.playerPokemon.name} used ${battleInstance.playerPokemon.selectedAttack.display} !`
          );
          await battleInstance.dealDamage(battleInstance.npcPokemon, battleInstance.playerPokemon);
          if (battleInstance.currentState !== states.battleEnd) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            battleInstance.dialogBox.clearText();
            battleInstance.currentState = states.npcTurn;
          }
          battleInstance.playerPokemon.isAttacking = false;
        })();
      }
      
      

      if (
        battleInstance.currentState === states.npcTurn &&
        !battleInstance.npcTurnInProgress &&
        !battleInstance.npcPokemon.isFainted
      ) {
        battleInstance.npcTurnInProgress = true;
      
        (async () => {
          battleInstance.npcPokemon.selectedAttack =
            battleInstance.npcPokemon.attacks[
              Math.floor(Math.random() * battleInstance.npcPokemon.attacks.length)
            ];
          battleInstance.dialogBox.clearText();
      
          await battleInstance.dialogBox.displayText(
            `The foe's ${battleInstance.npcPokemon.name} used ${battleInstance.npcPokemon.selectedAttack.name} !`
          );
      
          await battleInstance.dealDamage(battleInstance.playerPokemon, battleInstance.npcPokemon);
      
          if (battleInstance.currentState !== states.battleEnd) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            battleInstance.playerPokemon.selectedAttack = null;
            battleInstance.playerPokemon.isAttacking = false;
            battleInstance.currentState = states.playerTurn;
          }
      
          battleInstance.npcTurnInProgress = false;
        })();
      }
      
      

      if (battleInstance.currentState === states.battleEnd) {
        if (battleInstance.npcPokemon.isFainted) {
          (async () => {
            battleInstance.dialogBox.clearText();
            showPostBattleButtons();
            
            await battleInstance.dialogBox.displayText(`${battleInstance.npcPokemon.name} fainted! You won!`);
            await new Promise(resolve => setTimeout(resolve, 500));
            battleInstance.dialogBox.clearText();
            
            await battleInstance.dialogBox.displayText("keep fighting?");
            
      
            await battleInstance.dialogBox.displayText("keep fighting?");
            console.log("✅ Calling showPostBattleButtons()");
            showPostBattleButtons();

            battleInstance.currentState = states.postBattleChoice;
          })();
        }
      
        if (battleInstance.playerPokemon.isFainted) {
          battleInstance.dialogBox.clearText();
          battleInstance.dialogBox.displayText(
            `${battleInstance.playerPokemon.name} fainted! You lost!`
          );
          battleInstance.currentState = states.winnerDeclared;
        }
      }
      

      p.rect(0, 288, 512, 200);
      battleInstance.dialogBox.draw();

    },
    onKeyPressed(keyEvent) {
      // No longer using numeric keys for attack selection, as UI handles it
    },
  };

  function showPostBattleButtons() {
    console.log("🔥 showPostBattleButtons() called");
    const btnContainer = document.getElementById("post-battle-buttons");
    if (!btnContainer) {
      console.warn("⚠️ Could not find #post-battle-buttons in the DOM");
      return;
    }
  
    btnContainer.classList.remove("hidden");
    btnContainer.style.display = "flex";
    btnContainer.style.zIndex = "100";
    btnContainer.style.position = "absolute";
  
    document.getElementById("keep-fighting-btn").onclick = async () => {
      console.log("🟢 Keep Fighting clicked");
      btnContainer.style.display = "none";
      btnContainer.classList.add("hidden");
      await battleInstance.setup(); // Restart battle
    };
  
    document.getElementById("go-to-scoreboard-btn").onclick = () => {
      console.log("🔵 Scoreboard clicked");
      window.location.href = "/scoreboard.html"; // Or whatever your scoreboard link is
    };
  }
  

  return battleInstance;

  
  
}
