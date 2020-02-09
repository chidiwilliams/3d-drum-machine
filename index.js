import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const boardColor = 0x333333;

const boardWidth = 1;
const boardHeight = 1;
const boardDepth = 0.025;
const keysMargin = 0.05;
const keyLength = 0.20625;
const keyDepth = 0.015;

const inactiveKeyColor = 0xffffff;
const activeKeyColor = 0x88ee88;

const keysStartX = -boardWidth / 2 + keysMargin + keyLength / 2;
const keysStartY = boardHeight / 2 - keyLength / 2 - keysMargin;
const keyToKeyMargin = 0.025;

const numRows = 4;
const numColumns = 4;
const numKeys = numRows * numColumns;

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

function makeKeys() {
  const keys = [];

  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numColumns; j++) {
      keys.push(makeKey(i, j, false));
    }
  }

  return keys;
}

const board = makeBoard();
const keys = makeKeys();

const boardGroup = new THREE.Group();
boardGroup.add(board);
keys.forEach((k) => {
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

function makeKey(rowNum, colNum, disabled) {
  const key = new THREE.Mesh(
    new THREE.BoxGeometry(keyLength, keyLength, keyDepth),
    new THREE.MeshPhongMaterial({
      color: disabled ? activeKeyColor : inactiveKeyColor,
    }),
  );
  key.position.x = keysStartX + colNum * (keyLength + keyToKeyMargin);
  key.position.y = keysStartY - rowNum * (keyLength + keyToKeyMargin);
  key.position.z = boardDepth / 2 + keyDepth / 2;
  key.name = `key-${rowNum}-${colNum}`;
  return key;
}

function setKeyDown(key) {}

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

animate();

function redraw() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', redraw);

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  var width = window.innerWidth;
  var height = window.innerHeight;
  var canvasPixelWidth = canvas.width / window.devicePixelRatio;
  var canvasPixelHeight = canvas.height / window.devicePixelRatio;

  const needResize = canvasPixelWidth !== width || canvasPixelHeight !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

window.addEventListener('mousedown', function(event) {
  mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  var intersects = raycaster.intersectObjects(keys);

  if (intersects.length > 0) {
    const keyName = intersects[0].object.name;
    const [, row, column] = keyName.split('-').map(Number);
    toggleKeyStatus(getKey(row, column));
  }
});

function getKey(row, column) {
  return keys[row * numColumns + column];
}

function toggleKeyStatus(key) {
  key.material.color.setHex(
    key.material.color.equals(new THREE.Color(inactiveKeyColor))
      ? activeKeyColor
      : inactiveKeyColor,
  );
}
