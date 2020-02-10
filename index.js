import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

(function() {
  const CLEAR_COLOR = 0x000000;

  const BUTTON_LENGTH = 0.15;
  const BUTTON_DEPTH = 0.015;
  const BUTTON_MARGIN = 0.025;
  const INACTIVE_BUTTON_COLOR = 0xffffff;
  const ACTIVE_BUTTON_COLOR = 0x88ee88;
  const SCANNED_BUTTON_COLOR = 0xbbffbb;

  const BOARD_NUM_BUTTON_ROWS = 4;
  const BOARD_NUM_BUTTON_COLUMNS = 16;

  const BOARD_PADDING = 0.05;
  const BOARD_WIDTH =
    BOARD_NUM_BUTTON_COLUMNS * BUTTON_LENGTH +
    (BOARD_NUM_BUTTON_COLUMNS - 1) * BUTTON_MARGIN +
    2 * BOARD_PADDING;
  const BOARD_HEIGHT =
    BOARD_NUM_BUTTON_ROWS * BUTTON_LENGTH +
    (BOARD_NUM_BUTTON_ROWS - 1) * BUTTON_MARGIN +
    2 * BOARD_PADDING;
  const BOARD_DEPTH = 0.025;
  const BOARD_COLOR = 0x333333;

  const BOARD_BUTTONS_START_X =
    -BOARD_WIDTH / 2 + BUTTON_LENGTH / 2 + BOARD_PADDING;
  const BOARD_BUTTONS_START_Y =
    BOARD_HEIGHT / 2 - BUTTON_LENGTH / 2 - BOARD_PADDING;

  const DEFAULT_BUTTONS_STATE =
    '0100001001000110001101010010001010011010110101011000100010001000';

  const MAX_STATE_BITS = 32;
  const MAX_STATE_HEX = MAX_STATE_BITS / 4;

  const BEAT_INTERVAL = 125; // ms

  // Number of sounds must equal BOARD_NUM_BUTTON_ROWS
  const soundURLs = [
    'sounds/snare_drum.wav',
    'sounds/mid_tom.wav',
    'sounds/low_tom.wav',
    'sounds/bass_drum.wav',
  ];

  const soundBuffers = new Array(BOARD_NUM_BUTTON_ROWS);

  let currentButtonsState,
    audioCtx,
    currentScanCol = 0;

  // Initialize scenes, cameras, lights
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(CLEAR_COLOR);
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

  setButtonsStateWithHashOrDefault();

  updateButtonsWithState();

  animate();

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('touchstart', onTouchStart);
  window.addEventListener('hashchange', onHashChange);

  function makeBoard() {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD_WIDTH, BOARD_HEIGHT, BOARD_DEPTH),
      new THREE.MeshPhongMaterial({ color: BOARD_COLOR }),
    );

    return board;
  }

  function makeButtons() {
    const buttons = [];

    for (let i = 0; i < BOARD_NUM_BUTTON_ROWS; i++) {
      for (let j = 0; j < BOARD_NUM_BUTTON_COLUMNS; j++) {
        buttons.push(makeButton(i, j, false));
      }
    }

    return buttons;
  }

  function makeButton(rowNum, colNum, disabled) {
    const button = new THREE.Mesh(
      new THREE.BoxGeometry(BUTTON_LENGTH, BUTTON_LENGTH, BUTTON_DEPTH),
      new THREE.MeshPhongMaterial({
        color: disabled ? ACTIVE_BUTTON_COLOR : INACTIVE_BUTTON_COLOR,
      }),
    );
    button.position.x =
      BOARD_BUTTONS_START_X + colNum * (BUTTON_LENGTH + BUTTON_MARGIN);
    button.position.y =
      BOARD_BUTTONS_START_Y - rowNum * (BUTTON_LENGTH + BUTTON_MARGIN);
    button.position.z = BOARD_DEPTH / 2 + BUTTON_DEPTH / 2;
    button.name = `button-${rowNum}-${colNum}`;
    return button;
  }

  function setButtonsStateWithHashOrDefault() {
    const hash = window.location.hash;
    if (hash.length > 1) {
      const hashHex = hash.substring(1); // remove #
      currentButtonsState = hexToBin(hashHex);
    } else {
      currentButtonsState = DEFAULT_BUTTONS_STATE;
    }
  }

  function updateButtonsWithState() {
    buttons.forEach((button, i) => {
      if (i % BOARD_NUM_BUTTON_COLUMNS === currentScanCol) {
        setButtonAsScanned(button);
      } else if (currentButtonsState[i] === '1') {
        setButtonAsActive(button);
      } else {
        setButtonAsInactive(button);
      }
    });
  }

  let lastAnimationTime = new Date().getTime();
  function animate() {
    const curTime = new Date().getTime();

    if (curTime - lastAnimationTime >= BEAT_INTERVAL) {
      currentScanCol = (currentScanCol + 1) % BOARD_NUM_BUTTON_COLUMNS;
      updateButtonsWithState();

      const scannedColState = getStateAsBinaryArrayAtCol(currentScanCol);

      scannedColState.split('').forEach((buttonState, rowNum) => {
        if (buttonState === '1') {
          playSoundForRowNum(rowNum);
        }
      });

      lastAnimationTime = curTime;
    }

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }
  }

  function setButtonAsActive(button) {
    setButtonColor(button, ACTIVE_BUTTON_COLOR);
  }

  function setButtonAsInactive(button) {
    setButtonColor(button, INACTIVE_BUTTON_COLOR);
  }

  function setButtonAsScanned(button) {
    setButtonColor(button, SCANNED_BUTTON_COLOR);
  }

  function setButtonColor(button, color) {
    button.material.color.setHex(color);
  }

  function getStateAsBinaryArrayAtCol(colNum) {
    return currentButtonsState
      .split('')
      .filter((_, i) => i % BOARD_NUM_BUTTON_COLUMNS === colNum)
      .join('');
  }

  function playSoundForRowNum(rowNum) {
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

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const canvasPixelWidth = canvas.width / window.devicePixelRatio;
    const canvasPixelHeight = canvas.height / window.devicePixelRatio;

    const needResize =
      canvasPixelWidth !== width || canvasPixelHeight !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

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

  function onHashChange() {
    setButtonsStateWithHashOrDefault();
    updateButtonsWithState();
  }

  function initializeAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.resume();
      fetchSounds();
    }
  }

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

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

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
      window.location.hash = binToHex(currentButtonsState);
      updateButtonsWithState();
    }
  }

  function toggleStateAtIndex(row, column) {
    const index = row * BOARD_NUM_BUTTON_COLUMNS + column;
    const newStateAtIndex = currentButtonsState[index] === '0' ? '1' : '0';
    currentButtonsState =
      currentButtonsState.substring(0, index) +
      newStateAtIndex +
      currentButtonsState.substring(index + 1);
  }

  function binToHex(bin) {
    var hex = '';
    for (let i = 0, len = bin.length; i < len; i += MAX_STATE_BITS) {
      var tmp = parseInt(bin.substr(i, MAX_STATE_BITS), 2).toString(16);
      while (tmp.length < MAX_STATE_HEX) {
        tmp = '0' + tmp;
      }
      hex += tmp;
    }
    return hex;
  }

  function hexToBin(hex) {
    var bin = '';
    for (let i = 0, len = hex.length; i < len; i += MAX_STATE_HEX) {
      var tmp = parseInt(hex.substr(i, MAX_STATE_HEX), 16).toString(2);
      while (tmp.length < MAX_STATE_BITS) {
        tmp = '0' + tmp;
      }
      bin += tmp;
    }
    return bin;
  }
})();
