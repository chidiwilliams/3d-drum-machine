import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const clearColor = 0x000000;
const boardColor = 0x333333;

const buttonsMargin = 0.05;
const buttonLength = 0.15;
const buttonDepth = 0.015;

const numRows = 4;
const numColumns = 16;
const numButtons = numRows * numColumns;

const buttonToButtonMargin = 0.025;

const boardWidth =
  numColumns * buttonLength +
  (numColumns - 1) * buttonToButtonMargin +
  2 * buttonsMargin;
const boardHeight =
  numRows * buttonLength +
  (numRows - 1) * buttonToButtonMargin +
  2 * buttonsMargin;
const boardDepth = 0.025;

const inactiveButtonColor = 0xffffff;
const activeButtonColor = 0x88ee88;
const scannedButtonColor = 0xbbffbb;

const buttonsStartX = -boardWidth / 2 + buttonsMargin + buttonLength / 2;
const buttonsStartY = boardHeight / 2 - buttonLength / 2 - buttonsMargin;
const DEFAULT_BUTTONS_STATE =
  '0100001001000110001101010010001010011010110101011000100010001000';

let buttonsState =
  window.location.hash.length > 1
    ? hexToBin(window.location.hash.substring(1))
    : DEFAULT_BUTTONS_STATE;

let currentScanCol = 0;

const beatInterval = 125;

const MAX_BITS = 32;
const MAX_HEX = MAX_BITS / 4;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

let audioCtx;

// Number of sounds must equal numRows
const soundURLs = [
  'sounds/snare_drum.wav',
  'sounds/mid_tom.wav',
  'sounds/low_tom.wav',
  'sounds/bass_drum.wav',
];
const soundBuffers = new Array(numRows);

function fetchSounds() {
  soundURLs.forEach((url, i) => {
    const req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.responseType = 'arraybuffer';
    req.onload = function() {
      audioCtx.decodeAudioData(req.response, function(buffer) {
        soundBuffers[i] = buffer;
      });
    };
    req.send();
  });
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(clearColor);
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);

const frontLight = new THREE.DirectionalLight(0xffffff, 1);
frontLight.position.set(0.5, 0, 0.7);
scene.add(frontLight);

scene.add(new THREE.AmbientLight(0xffffff, 0.3));

const backLight = new THREE.DirectionalLight(0xffffff, 0.7);
backLight.position.set(0, 0, -1);
scene.add(backLight);

camera.position.z = 3;

function makeButtons() {
  const buttons = [];

  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numColumns; j++) {
      buttons.push(makeButton(i, j, false));
    }
  }

  return buttons;
}

const board = makeBoard();
const buttons = makeButtons();

const boardGroup = new THREE.Group();
boardGroup.add(board);
buttons.forEach((k) => {
  boardGroup.add(k);
});
boardGroup.rotation.x = -Math.PI / 6;
boardGroup.rotation.z = Math.PI / 36;

scene.add(boardGroup);

const controls = new OrbitControls(camera, renderer.domElement);

function makeBoard() {
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(boardWidth, boardHeight, boardDepth),
    new THREE.MeshPhongMaterial({ color: boardColor }),
  );

  scene.add(board);
  return board;
}

function makeButton(rowNum, colNum, disabled) {
  const button = new THREE.Mesh(
    new THREE.BoxGeometry(buttonLength, buttonLength, buttonDepth),
    new THREE.MeshPhongMaterial({
      color: disabled ? activeButtonColor : inactiveButtonColor,
    }),
  );
  button.position.x =
    buttonsStartX + colNum * (buttonLength + buttonToButtonMargin);
  button.position.y =
    buttonsStartY - rowNum * (buttonLength + buttonToButtonMargin);
  button.position.z = boardDepth / 2 + buttonDepth / 2;
  button.name = `button-${rowNum}-${colNum}`;
  return button;
}

let lastTime = new Date().getTime();
function animate() {
  const curTime = new Date().getTime();

  if (curTime - lastTime >= beatInterval) {
    currentScanCol = (currentScanCol + 1) % numColumns;
    updateButtonsWithState();

    const scannedColState = getStateAsBinaryArrayAtCol(currentScanCol);

    scannedColState.split('').forEach((buttonState, rowNum) => {
      if (buttonState === '1') {
        try {
          const buffer = soundBuffers[rowNum];
          if (audioCtx && buffer) {
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start();
          }
        } catch (e) {
          new Audio(soundURLs[rowNum]).play();
        }
      }
    });

    lastTime = curTime;
  }

  requestAnimationFrame(animate);
  render();
  controls.update();

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
}

function getStateAsBinaryArrayAtCol(colNum) {
  return buttonsState
    .split('')
    .filter((_, i) => i % numColumns === colNum)
    .join('');
}

function render() {
  renderer.render(scene, camera);
}

function updateButtonsWithState() {
  buttons.forEach((button, i) => {
    if (i % numColumns === currentScanCol) {
      setButtonAsScanned(button);
    } else if (buttonsState[i] === '1') {
      setButtonAsActive(button);
    } else {
      setButtonAsInactive(button);
    }
  });
}

updateButtonsWithState();

animate();

function redraw() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', redraw);

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const canvasPixelWidth = canvas.width / window.devicePixelRatio;
  const canvasPixelHeight = canvas.height / window.devicePixelRatio;

  const needResize = canvasPixelWidth !== width || canvasPixelHeight !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

function toggleStateAtIndex(row, column) {
  const index = row * numColumns + column;
  const newStateAtIndex = buttonsState[index] === '0' ? '1' : '0';
  buttonsState =
    buttonsState.substring(0, index) +
    newStateAtIndex +
    buttonsState.substring(index + 1);
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseDown(event) {
  initializeAudio();
  updateMousePosition(event.clientX, event.clientY);
  handleMouseInteraction();
}

function onTouchStart(event) {
  initializeAudio();
  updateMousePosition(event.touches[0].clientX, event.touches[0].clientY);
  handleMouseInteraction();
}

function updateMousePosition(clientX, clientY) {
  mouse.x = (clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(clientY / renderer.domElement.clientHeight) * 2 + 1;
}

function handleMouseInteraction() {
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(buttons);

  if (intersects.length > 0) {
    const buttonName = intersects[0].object.name;
    const [, row, column] = buttonName.split('-').map(Number);
    toggleStateAtIndex(row, column);
    window.location.hash = binToHex(buttonsState);
    updateButtonsWithState();
  }
}

function initializeAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    fetchSounds();
  }
}

window.addEventListener('mousedown', onMouseDown);
window.addEventListener('touchstart', onTouchStart);

function setButtonAsActive(button) {
  setButtonColor(button, activeButtonColor);
}

function setButtonAsInactive(button) {
  setButtonColor(button, inactiveButtonColor);
}

function setButtonAsScanned(button) {
  setButtonColor(button, scannedButtonColor);
}

function setButtonColor(button, color) {
  button.material.color.setHex(color);
}

function binToHex(bin) {
  var hex = '';
  for (let i = 0, len = bin.length; i < len; i += MAX_BITS) {
    var tmp = parseInt(bin.substr(i, MAX_BITS), 2).toString(16);
    while (tmp.length < MAX_HEX) {
      tmp = '0' + tmp;
    }
    hex += tmp;
  }
  return hex;
}

function hexToBin(hex) {
  var bin = '';
  for (let i = 0, len = hex.length; i < len; i += MAX_HEX) {
    var tmp = parseInt(hex.substr(i, MAX_HEX), 16).toString(2);
    while (tmp.length < MAX_BITS) {
      tmp = '0' + tmp;
    }
    bin += tmp;
  }
  return bin;
}

window.addEventListener('hashchange', function() {
  buttonsState =
    window.location.hash.length > 1
      ? hexToBin(window.location.hash.substring(1))
      : DEFAULT_BUTTONS_STATE;
  updateButtonsWithState();
});
