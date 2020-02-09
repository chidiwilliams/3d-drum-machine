import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff);
document.body.appendChild(renderer.domElement);

const frontLight = new THREE.DirectionalLight(0xffffff, 1);
frontLight.position.set(0.5, 0, 1);
scene.add(frontLight);

scene.add(new THREE.AmbientLight(0xffffff, 0.1));

const backLight = new THREE.DirectionalLight(0xffffff, 1);
backLight.position.set(0, 0, -1);
scene.add(backLight);

camera.position.z = 3;

const boardColor = 0x333333;

const boardWidth = 1;
const boardHeight = 1;
const boardDepth = 0.025;
const keysMargin = 0.05;
const keyLength = 0.20625;
const keyDepth = 0.015;

const keysStartX = -boardWidth / 2 + keysMargin + keyLength / 2;
const keysStartY = boardHeight / 2 - keyLength / 2 - keysMargin;
const keyToKeyMargin = 0.025;

function makeBoard() {
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(boardWidth, boardHeight, boardDepth),
    new THREE.MeshPhongMaterial({ color: boardColor }),
  );

  // scene.add(board);
  // board.rotation.x = 2;
  // board.rotation.z = 0.1;
  return board;
}

function makeKeys() {
  const keys = [];
  const numRows = 4;
  const numColumns = 4;

  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numColumns; j++) {
      keys.push(
        makeKey(
          keysStartX + j * (keyLength + keyToKeyMargin),
          keysStartY - i * (keyLength + keyToKeyMargin),
          boardDepth / 2 + keyDepth / 2,
        ),
      );
    }
  }

  return keys;
}

const keyColor = 0x99ee99;

function makeKey(x, y, z) {
  const key = new THREE.Mesh(
    new THREE.BoxGeometry(keyLength, keyLength, keyDepth),
    new THREE.MeshPhongMaterial({ color: keyColor }),
  );
  // scene.add(key);
  key.position.x = x;
  key.position.y = y;
  key.position.z = z;

  // key.rotation.z = 0.1;
  return key;
}

function setKeyDown(key) {}

const board = makeBoard();
const keys = makeKeys();

const boardGroup = new THREE.Group();
boardGroup.add(board);
boardGroup.add(...keys);

scene.add(boardGroup);
// boardGroup.rotation.x = -1;
// boardGroup.rotation.z = 0.5;

const controls = new OrbitControls(camera, renderer.domElement);

const animate = function() {
  controls.update();
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
};

animate();

function redraw() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', redraw);
