/******************************************************
 * Global Variables to Store JSON Data
 ******************************************************/
let alignmentsJSON = null;
let planesJSON = null;
let speciesJSON = null;
let traitsJSON = null;
let classesJSON = null;
let tarotJSON = null;

/******************************************************
 * On Page Load, Fetch All JSON Files
 ******************************************************/
window.addEventListener('DOMContentLoaded', () => {
  Promise.all([
    fetch('data/alignments.json').then(r => r.json()),
    fetch('data/planes.json').then(r => r.json()),
    fetch('data/species.json').then(r => r.json()),
    fetch('data/traits.json').then(r => r.json()),
    fetch('data/classes.json').then(r => r.json()),
    fetch('data/tarot.json').then(r => r.json())
  ])
  .then(([alignmentsData, planesData, speciesData, traitsData, classesData, tarotData]) => {
    alignmentsJSON = alignmentsData;
    planesJSON = planesData;
    speciesJSON = speciesData;
    traitsJSON = traitsData;
    classesJSON = classesData;
    tarotJSON = tarotData;

    console.log('All JSON files loaded.');

    // Add event listener for the Generate button
    document.getElementById('generateBtn').addEventListener('click', handleGenerate);
  })
  .catch(err => {
    console.error('Error loading JSON data:', err);
  });
});

/******************************************************
 * Click Handler: Generate NPC
 ******************************************************/
function handleGenerate() {
  // Which type of NPC is selected?
  const npcType = getSelectedNpcType(); 
  if (!npcType) {
    alert("Please select an NPC type.");
    return;
  }

  // 50% scenario-based, 50% random from plane
  const { alignmentDisplay, alignmentFlavor, plane } = generateAlignment(npcType);

  // pick traits based on alignmentFlavor (good/evil/neutral)
  const chosenTraits = pickThreeTraits(alignmentFlavor);

  // rest is the same
  const chosenClass = pickClass();
  const chosenSpecies = pickSpecies();
  const chosenTarot = randomFromArray(tarotJSON);

  // final result
  const result = {
    npcType,
    alignment: alignmentDisplay,  // full string
    plane,
    traits: chosenTraits,
    class: chosenClass,
    species: chosenSpecies,
    tarot: chosenTarot
  };

  const output = document.getElementById('output');
  output.textContent = JSON.stringify(result, null, 2);
}

/******************************************************
 * Logic: Alignment
 * - 50% scenario-based, 50% from planes.json
 ******************************************************/
function generateAlignment(npcType) {
  let alignmentDisplay, alignmentFlavor, plane;

  const scenarioRoll = Math.random();
  if (scenarioRoll < 0.5 && alignmentsJSON[npcType]) {
    // scenario
    const scenarioData = alignmentsJSON[npcType];
    alignmentDisplay = pickScenarioAlignment(scenarioData); // e.g. "Lawful Good"
    alignmentFlavor = deriveFlavor(alignmentDisplay);
    plane = "Scenario-based, not a specific plane";
  } else {
    // random plane
    const planeChoice = randomFromArray(planesJSON);
    plane = planeChoice.plane;
    // e.g. planeChoice.alignment = ["Lawful Evil Lawful Neutral"]
    // pick a single string from array (in case there are multiple)
    alignmentDisplay = randomFromArray(planeChoice.alignment); 
    // e.g. "Lawful Evil Lawful Neutral"

    // parse it for good/evil/neutral
    alignmentFlavor = deriveFlavor(alignmentDisplay);
  }

  return { alignmentDisplay, alignmentFlavor, plane };
}

/**
 * scenarioData structure from alignments.json could produce something 
 * like "Lawful Good" or "True Neutral". 
 */
function pickScenarioAlignment(scenarioData) {
  const ethicRoll = Math.random() * 100;
  let ethic = 'Neutral';
  if (ethicRoll < scenarioData.good) ethic = 'Good';
  else if (ethicRoll < scenarioData.good + scenarioData.neutral) ethic = 'Neutral';
  else ethic = 'Evil';

  const moralRoll = Math.random() * 100;
  let moral = 'Neutral';
  if (moralRoll < scenarioData.lawful) moral = 'Lawful';
  else if (moralRoll < scenarioData.lawful + scenarioData.neutralEthic) moral = 'Neutral';
  else moral = 'Chaotic';

  if (moral === 'Neutral' && ethic === 'Neutral') {
    return 'True Neutral';
  }
  return `${moral} ${ethic}`;
}

/******************************************************
 * Helper: determine if alignment string contains "evil" or "good"
 ******************************************************/
function deriveFlavor(fullString) {
  const lc = fullString.toLowerCase();
  if (lc.includes("evil")) return "evil";
  if (lc.includes("good")) return "good";
  // else
  return "neutral";
}

/******************************************************
 * NEW Logic: Traits Based on good/evil/neutral
 ******************************************************/
function pickThreeTraits(flavor) {
  if (!traitsJSON || !Array.isArray(traitsJSON)) return [];

  let numVirtues = 0, numVices = 0, numRandom = 0;

  if (flavor === "good") {
    numVirtues = 2;
    numVices = 1;
  } else if (flavor === "evil") {
    numVirtues = 1;
    numVices = 2;
  } else {
    // neutral
    numVirtues = 1;
    numVices = 1;
    numRandom = 1;
  }

  const pool = [...traitsJSON];
  shuffleArray(pool);

  const chosenPairs = pool.slice(0, 3);
  const finalTraits = [];

  for (let i = 0; i < chosenPairs.length; i++) {
    const pairStr = chosenPairs[i];
    const [virtueSide, viceSide] = pairStr.split("/").map(s => s.trim());
    const pairsRemaining = chosenPairs.length - i;

    if (numVirtues === pairsRemaining) {
      finalTraits.push(virtueSide);
      numVirtues--;
      continue;
    }
    if (numVices === pairsRemaining) {
      finalTraits.push(viceSide);
      numVices--;
      continue;
    }
    if (numRandom > 0) {
      if (Math.random() < 0.5) {
        finalTraits.push(Math.random() < 0.5 ? virtueSide : viceSide);
        numRandom--;
        continue;
      }
    }
    if (numVirtues > 0) {
      finalTraits.push(virtueSide);
      numVirtues--;
      continue;
    }
    if (numVices > 0) {
      finalTraits.push(viceSide);
      numVices--;
      continue;
    }
    finalTraits.push(virtueSide);
  }

  return finalTraits;
}

/**
 * Utility: shuffle array in-place
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/******************************************************
 * Logic: Class Distribution
 ******************************************************/
function pickClass() {
  if (!classesJSON) return null;
  const roll = Math.random() * 100;
  if (roll < 30) {
    return randomFromArray(classesJSON.combat);
  } else if (roll < 60) {
    return randomFromArray(classesJSON.stealth);
  } else if (roll < 90) {
    return randomFromArray(classesJSON.knowledge);
  } else {
    const subRoll = Math.random() * 100;
    if (subRoll < 30) {
      return randomFromArray(classesJSON.spellcasting.int);
    } else if (subRoll < 60) {
      return randomFromArray(classesJSON.spellcasting.wis);
    } else if (subRoll < 90) {
      return randomFromArray(classesJSON.spellcasting.cha);
    } else {
      return randomFromArray(classesJSON.spellcasting.multi);
    }
  }
}

/******************************************************
 * Logic: Species Distribution
 ******************************************************/
function pickSpecies() {
  if (!speciesJSON) return null;
  let roll = Math.random() * 100;
  let cumulative = 0;

  cumulative += speciesJSON.human;
  if (roll < cumulative) return "Human";

  cumulative += speciesJSON.dwarf;
  if (roll < cumulative) return "Dwarf";

  cumulative += speciesJSON.orc;
  if (roll < cumulative) return "Orc";

  cumulative += speciesJSON.halfling;
  if (roll < cumulative) return "Halfling";

  cumulative += speciesJSON.phbSpellcastersPercent;
  if (roll < cumulative) {
    return randomFromArray(speciesJSON.phbSpellcasters);
  }
  return randomFromArray(speciesJSON.weirdShapechanged);
}

/******************************************************
 * Utilities
 ******************************************************/
function randomFromArray(arr) {
  if (!arr || arr.length === 0) return null;
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

function randomPopFromArray(arr) {
  if (!arr || arr.length === 0) return null;
  const idx = Math.floor(Math.random() * arr.length);
  const item = arr[idx];
  arr.splice(idx, 1);
  return item;
}

/******************************************************
 * DOM Helpers
 ******************************************************/
function getSelectedNpcType() {
  const radios = document.getElementsByName("npcType");
  for (let r of radios) {
    if (r.checked) {
      return r.value;
    }
  }
  return null;
}
