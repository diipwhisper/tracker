// Konfigurasi Firebase - GANTI DENGAN KONFIGURASI ANDA
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Konstanta untuk Firestore collection
const PASSWORD_COLLECTION = "passwords";
const ACTIVE_PASSWORD_DOC = "active_password";
const ACCESS_LOGS_COLLECTION = "access_logs";

// Elemen DOM
const passwordInput = document.getElementById('passwordInput');
const togglePassword = document.getElementById('togglePassword');
const eyeOpen = document.querySelector('.eye-open');
const eyeClosed = document.querySelector('.eye-closed');
const submitButton = document.getElementById('submitButton');
const message = document.getElementById('message');

// State aplikasi
let correctPassword = "";
let isChecking = false;

// Toggle tampilan password
togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);

    if (type === 'password') {
        eyeOpen.style.opacity = '1';
        eyeClosed.style.opacity = '0';
    } else {
        eyeOpen.style.opacity = '0';
        eyeClosed.style.opacity = '1';
    }
});

// Ambil password dari Firestore saat halaman dimuat
async function fetchPasswordFromFirestore() {
    try {
        showMessage('Loading...', 'loading');
        
        const docRef = db.collection(PASSWORD_COLLECTION).doc(ACTIVE_PASSWORD_DOC);
        const doc = await docRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            correctPassword = data.password || "";
            
            if (correctPassword) {
                console.log("Password loaded from Firestore");
                showMessage('Ready to authenticate', 'success');
                setTimeout(() => {
                    message.textContent = '';
                    message.className = 'password-message';
                }, 1500);
            } else {
                showMessage('Password not set in database', 'error');
            }
        } else {
            showMessage('No password configuration found', 'error');
            // Buat dokumen default jika tidak ada
            await createDefaultPassword();
        }
    } catch (error) {
        console.error("Error fetching password:", error);
        showMessage('Error connecting to database', 'error');
    }
}

// Buat password default jika dokumen tidak ada
async function createDefaultPassword() {
    try {
        const defaultPassword = "divanianurrosyda4578";
        await db.collection(PASSWORD_COLLECTION).doc(ACTIVE_PASSWORD_DOC).set({
            password: defaultPassword,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        correctPassword = defaultPassword;
        showMessage('Default password set', 'success');
        setTimeout(() => {
            message.textContent = '';
            message.className = 'password-message';
        }, 1500);
    } catch (error) {
        console.error("Error creating default password:", error);
    }
}

// Fungsi untuk mencatat log akses
async function logAccessAttempt(enteredPassword, isSuccess, ipAddress = null) {
    try {
        await db.collection(ACCESS_LOGS_COLLECTION).add({
            enteredPassword: enteredPassword,
            isSuccess: isSuccess,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userAgent: navigator.userAgent,
            ipAddress: ipAddress || await getIPAddress(),
            pageUrl: window.location.href
        });
    } catch (error) {
        console.error("Error logging access attempt:", error);
    }
}

// Fungsi untuk mendapatkan IP address
async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return "Unknown";
    }
}

// Fungsi untuk memeriksa password
async function checkPassword() {
    if (isChecking) return;
    
    const enteredPassword = passwordInput.value.trim();

    // Reset pesan
    message.textContent = '';
    message.className = 'password-message';

    if (!enteredPassword) {
        showMessage('Please enter a password', 'error');
        passwordInput.classList.add('shake');
        setTimeout(() => passwordInput.classList.remove('shake'), 500);
        return;
    }

    if (!correctPassword) {
        showMessage('System not ready. Please refresh.', 'error');
        return;
    }

    isChecking = true;
    submitButton.disabled = true;
    submitButton.textContent = 'CHECKING...';
    showMessage('<span class="spinner"></span> Verifying password...', 'loading');

    try {
        // Simulasi delay untuk UX
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (enteredPassword === correctPassword) {
            // Catat log sukses
            await logAccessAttempt(enteredPassword, true);
            
            showMessage('✓ Password correct! Redirecting...', 'success');

            // Simpan status login di localStorage
            localStorage.setItem('elaravoid_authenticated', 'true');
            localStorage.setItem('elaravoid_auth_timestamp', Date.now());

            // Redirect ke halaman utama setelah 1.5 detik
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } else {
            // Catat log gagal
            await logAccessAttempt(enteredPassword, false);
            
            showMessage('✗ Incorrect password. Try again.', 'error');
            passwordInput.classList.add('shake');
            setTimeout(() => passwordInput.classList.remove('shake'), 500);

            // Kosongkan input
            passwordInput.value = '';
            passwordInput.focus();
        }
    } catch (error) {
        console.error("Error during password check:", error);
        showMessage('Error verifying password', 'error');
    } finally {
        isChecking = false;
        submitButton.disabled = false;
        submitButton.textContent = 'ACCESS';
    }
}

// Fungsi untuk menampilkan pesan
function showMessage(text, type) {
    message.innerHTML = text;
    message.className = `password-message ${type}`;
}

// Event listener untuk tombol submit
submitButton.addEventListener('click', checkPassword);

// Event listener untuk tekan Enter
passwordInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter' && !isChecking) {
        checkPassword();
    }
});

// Cek jika pengguna sudah login
function checkExistingAuth() {
    const isAuthenticated = localStorage.getItem('elaravoid_authenticated');
    const authTimestamp = localStorage.getItem('elaravoid_auth_timestamp');
    
    if (isAuthenticated === 'true' && authTimestamp) {
        // Cek jika login masih valid (24 jam)
        const timeDiff = Date.now() - parseInt(authTimestamp);
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
            // Redirect jika masih dalam 24 jam
            // window.location.href = '/';
        } else {
            // Hapus auth yang expired
            localStorage.removeItem('elaravoid_authenticated');
            localStorage.removeItem('elaravoid_auth_timestamp');
        }
    }
}

// Inisialisasi aplikasi
async function initApp() {
    // Cek auth terlebih dahulu
    checkExistingAuth();
    
    // Fokus pada input
    passwordInput.focus();
    
    // Ambil password dari Firestore
    await fetchPasswordFromFirestore();
}

// Jalankan inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', initApp);