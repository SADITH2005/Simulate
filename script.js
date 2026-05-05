let targetWeight = 0;
let currentWeight = 0;
let itemsOnScale = 0;
let addedItemsList = []; // 🚀 අයිටම්ස් මතක තබා ගන්නා Array එක

const container = document.getElementById('container');
const scanBtn = document.getElementById('scan-btn');
const submitBtn = document.getElementById('submit-btn');
const undoBtn = document.getElementById('undo-btn');
const clearBtn = document.getElementById('clear-btn');
const draggables = document.querySelectorAll('.draggable-box');
const aiToggle = document.getElementById('ai-toggle');
const aiTerminal = document.getElementById('ai-terminal');
const statusMsg = document.getElementById('status-msg');

// --- Three.js Setup & Optimization ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe6e9);
const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040, 1.5));

const plateGeo = new THREE.BoxGeometry(6, 0.4, 6);
const plateMat = new THREE.MeshLambertMaterial({ color: 0x34495e }); 
const plate = new THREE.Mesh(plateGeo, plateMat);
scene.add(plate);

camera.position.set(0, 10, 14);
camera.lookAt(0, 0, 0);

const geo1kg = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const geo2kg = new THREE.BoxGeometry(1.13, 1.13, 1.13); 
const geo5kg = new THREE.BoxGeometry(1.78, 1.78, 1.78); 

const mat1kg = new THREE.MeshLambertMaterial({ color: 0xe67e22 });
const mat2kg = new THREE.MeshLambertMaterial({ color: 0x2980b9 });
const mat5kg = new THREE.MeshLambertMaterial({ color: 0x8e44ad });


// --- Sounds ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);
    
    if(type === 'scan') {
        osc.type = 'sine'; osc.frequency.value = 1500; 
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); 
        osc.start(); osc.stop(audioCtx.currentTime + 0.15); 
    } else if(type === 'pass') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); 
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } else if(type === 'fail' || type === 'remove') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3); 
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    } else if(type === 'ai') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    }
}

// --- Add Item Logic ---
draggables.forEach(draggable => {
    draggable.addEventListener('dragstart', (ev) => ev.dataTransfer.setData("weight", ev.target.getAttribute("data-weight")));
    draggable.addEventListener('click', (ev) => add3DBox(parseFloat(ev.target.getAttribute("data-weight"))));
});

container.addEventListener('dragover', (ev) => ev.preventDefault());
container.addEventListener('drop', (ev) => {
    ev.preventDefault();
    const w = ev.dataTransfer.getData("weight");
    if (w) add3DBox(parseFloat(w));
});

function add3DBox(weight) {
    let boxGeo, boxMat, size;
    
    if (weight === 1) { boxGeo = geo1kg; boxMat = mat1kg; size = 0.8; }
    else if (weight === 2) { boxGeo = geo2kg; boxMat = mat2kg; size = 1.13; }
    else { boxGeo = geo5kg; boxMat = mat5kg; size = 1.78; }

    const mesh = new THREE.Mesh(boxGeo, boxMat);
    mesh.position.set((Math.random() - 0.5) * 4, 0.4 + size/2 + (itemsOnScale * 0.1), (Math.random() - 0.5) * 4);
    
    mesh.castShadow = false; mesh.receiveShadow = false;
    scene.add(mesh);

    // 🚀 ඇඩ් කරන අයිටම් එක ලිස්ට් එකට දාගන්නවා
    addedItemsList.push({ mesh: mesh, weight: weight });

    currentWeight += weight;
    itemsOnScale++;
    updateUI();
}

// --- 🚀 Remove Items Logic ---
undoBtn.addEventListener('click', () => {
    if (addedItemsList.length === 0) return;
    
    // අන්තිම එක ගන්නවා
    const lastItem = addedItemsList.pop();
    scene.remove(lastItem.mesh); // 3D එකෙන් අයින් කරනවා
    
    currentWeight -= lastItem.weight;
    itemsOnScale--;
    
    if (currentWeight < 0.01) currentWeight = 0; // Fix JS floating point issues
    
    resetValidation();
    playSound('remove');
    updateUI();
});

clearBtn.addEventListener('click', () => {
    if (addedItemsList.length === 0) return;
    
    // ඔක්කොම අයින් කරනවා
    addedItemsList.forEach(item => scene.remove(item.mesh));
    addedItemsList = [];
    currentWeight = 0;
    itemsOnScale = 0;
    
    resetValidation();
    playSound('remove');
    updateUI();
});

function resetValidation() {
    statusMsg.style.display = "none";
    submitBtn.disabled = false;
    submitBtn.innerText = "SUBMIT VERIFICATION";
    if(aiToggle.checked) aiTerminal.innerHTML = "System reset. Ready for scan...";
}

// --- Invoice Scan ---
scanBtn.addEventListener('click', () => {
    scanBtn.innerText = "SCANNING...";
    scanBtn.style.background = "#f39c12";
    playSound('scan');
    setTimeout(() => {
        targetWeight = 8; 
        document.getElementById('target-val').innerText = targetWeight.toFixed(2) + " KG";
        scanBtn.innerText = "SCANNED ✓";
        scanBtn.style.background = "#27ae60";
        scanBtn.disabled = true;
    }, 500);
});

function updateUI() {
    document.getElementById('current-val').innerText = currentWeight.toFixed(2) + " KG";
}

// --- AI & Submit Logic ---
submitBtn.addEventListener('click', () => {
    if (targetWeight === 0) { alert("Please scan invoice first!"); return; }
    
    statusMsg.style.display = "none";
    
    if (aiToggle.checked) {
        submitBtn.disabled = true;
        submitBtn.innerText = "AI ANALYZING...";
        aiTerminal.innerHTML = "> Initiating Neural Net...<br>";
        playSound('ai');
        
        setTimeout(() => {
            aiTerminal.innerHTML += "> Scanning geometries...<br>";
            playSound('ai');
        }, 800);

        setTimeout(() => {
            let confidence = (Math.random() * (99.9 - 85.0) + 85.0).toFixed(2);
            aiTerminal.innerHTML += `> Match Confidence: ${confidence}%<br>`;
            
            let aiFoundDefect = Math.random() < 0.2; 
            
            if (currentWeight === targetWeight && !aiFoundDefect) {
                aiTerminal.innerHTML += "> Status: ALL CLEAR";
                showResult('pass', '✅ PASS<br><small>Weight Matched & AI Vision Cleared!</small>');
            } else if (currentWeight === targetWeight && aiFoundDefect) {
                aiTerminal.innerHTML += "> WARNING: Damaged box detected!";
                showResult('fail', '❌ AI REJECT<br><small>Weight correct, but AI detected damaged item!</small>');
            } else {
                aiTerminal.innerHTML += "> Error: Dimensional mismatch.";
                showResult('fail', '❌ FAIL<br><small>Weight Mismatch!</small>');
            }
            
            submitBtn.disabled = false;
            submitBtn.innerText = "SUBMIT VERIFICATION";
        }, 2000);
        
    } else {
        if (currentWeight === targetWeight) {
            showResult('pass', '✅ PASS<br><small>Weight matched perfectly!</small>');
        } else if (currentWeight > targetWeight) {
            showResult('fail', '❌ FAIL: OVERWEIGHT<br><small>Weight exceeds invoice target!</small>');
        } else {
            showResult('fail', '⚠️ FAIL: UNDERWEIGHT<br><small>Weight is below invoice target!</small>');
        }
    }
});

function showResult(type, htmlContent) {
    statusMsg.style.display = "block";
    statusMsg.innerHTML = htmlContent;
    if (type === 'pass') {
        playSound('pass');
        statusMsg.style.background = "#27ae60";
        statusMsg.style.color = "white";
    } else {
        playSound('fail');
        statusMsg.style.background = "#c0392b"; 
        statusMsg.style.color = "white";
    }
}

// --- Animation Loop ---
function animate() { 
    requestAnimationFrame(animate); 
    renderer.render(scene, camera); 
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});