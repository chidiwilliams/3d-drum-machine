import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const boardColor = 0x333333;

const boardWidth = 1;
const boardHeight = 1;
const boardDepth = 0.025;
const buttonsMargin = 0.05;
const buttonLength = 0.20625;
const buttonDepth = 0.015;

const inactiveButtonColor = 0xffffff;
const activeButtonColor = 0x88ee88;
const scannedButtonColor = 0xbbffbb;

const buttonsStartX = -boardWidth / 2 + buttonsMargin + buttonLength / 2;
const buttonsStartY = boardHeight / 2 - buttonLength / 2 - buttonsMargin;
const buttonToButtonMargin = 0.025;

const numRows = 4;
const numColumns = 4;
const numButtons = numRows * numColumns;

let buttonsState = 0b1100001000001010;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff);
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);

const frontLight = new THREE.DirectionalLight(0xffffff, 1);
frontLight.position.set(0.5, 0, 1);
scene.add(frontLight);

scene.add(new THREE.AmbientLight(0xffffff, 0.1));

const backLight = new THREE.DirectionalLight(0xffffff, 1);
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

function setButtonDown(button) {}

const animate = function() {
  requestAnimationFrame(animate);
  render();
  controls.update();

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
};

function render() {
  renderer.render(scene, camera);
}

function updateButtonsWithState() {
  const stateArr = stateAsBinaryArray();

  buttons.forEach((button, i) => {
    stateArr[i] ? setButtonAsActive(button) : setButtonAsInactive(button);
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

function stateAsBinaryArray() {
  return buttonsState
    .toString(2)
    .padStart(numButtons, '0')
    .split('')
    .map(Number);
}

function toggleStateAtIndex(row, column) {
  const currStateAsArr = stateAsBinaryArray();
  const index = row * numColumns + column;
  currStateAsArr[index] = (currStateAsArr[index] + 1) % 2;
  buttonsState = parseInt(currStateAsArr.join(''), 2);
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function toggleButtonState(event) {
  mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(buttons);

  if (intersects.length > 0) {
    const buttonName = intersects[0].object.name;
    const [, row, column] = buttonName.split('-').map(Number);
    toggleStateAtIndex(row, column);
    updateButtonsWithState();
  }
}

window.addEventListener('mousedown', toggleButtonState);

function getButton(row, column) {
  return buttons[row * numColumns + column];
}

function setButtonAsActive(button) {
  setButtonColor(button, activeButtonColor);
}

function setButtonAsInactive(button) {
  setButtonColor(button, inactiveButtonColor);
}

function setButtonColor(button, color) {
  button.material.color.setHex(color);
}

// let currentScanCol = 0;
// setInterval(() => {
//   // set column buttons to scan color
//   // play sound represented by column
//   console.log(`scanning, now on row ${currentScanCol}`);
//   currentScanCol = (currentScanCol + 1) % numColumns;
// }, 500);

// function updateButtonsStatus() {}
