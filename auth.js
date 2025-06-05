/**
 * Authentication system for Flash Cards App
 * Handles user registration, login, and session management
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = this.loadUsers();
        this.initializeAuth();
    }

    initializeAuth() {
        // Check if user is already logged in
        const savedSession = localStorage.getItem('flashcard-session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                if (this.validateSession(session)) {
                    this.currentUser = session.username;
                    this.showApp();
                    return;
                }
            } catch (error) {
                console.error('Invalid session data:', error);
            }
        }
        
        // Show login screen if no valid session
        this.showLoginScreen();
    }

    validateSession(session) {
        // Check if session is valid (not expired, user exists)
        if (!session.username || !session.timestamp) return false;
        
        // Session expires after 30 days
        const sessionAge = Date.now() - session.timestamp;
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        
        if (sessionAge > maxAge) return false;
        
        // Check if user still exists
        return this.users.hasOwnProperty(session.username);
    }

    loadUsers() {
        const savedUsers = localStorage.getItem('flashcard-users');
        return savedUsers ? JSON.parse(savedUsers) : {};
    }

    saveUsers() {
        localStorage.setItem('flashcard-users', JSON.stringify(this.users));
    }

    hashPassword(password) {
        // Simple hash function for demo purposes
        // In production, use proper password hashing
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    register(username, password, email) {
        // Validate input
        if (!username || !password || !email) {
            throw new Error('All fields are required');
        }

        if (username.length < 3) {
            throw new Error('Username must be at least 3 characters long');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        if (!this.isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        // Check if username already exists
        if (this.users[username]) {
            throw new Error('Username already exists');
        }

        // Check if email already exists
        for (const user of Object.values(this.users)) {
            if (user.email === email) {
                throw new Error('Email already registered');
            }
        }

        // Create new user
        this.users[username] = {
            password: this.hashPassword(password),
            email: email,
            createdAt: Date.now(),
            progress: {
                knownIds: [],
                learningIds: [],
                history: [],
                favourites: [],
                lastCardIndex: 0,
                totalSessionTime: 0,
                streakDays: 0,
                lastActiveDate: null
            }
        };

        this.saveUsers();
        return true;
    }

    login(username, password) {
        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        const user = this.users[username];
        if (!user) {
            throw new Error('Invalid username or password');
        }

        if (user.password !== this.hashPassword(password)) {
            throw new Error('Invalid username or password');
        }

        // Create session
        this.currentUser = username;
        const session = {
            username: username,
            timestamp: Date.now()
        };

        localStorage.setItem('flashcard-session', JSON.stringify(session));
        return true;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('flashcard-session');
        this.showLoginScreen();
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserProgress(username = this.currentUser) {
        if (!username || !this.users[username]) {
            return null;
        }
        return this.users[username].progress;
    }

    saveUserProgress(progress, username = this.currentUser) {
        if (!username || !this.users[username]) {
            return false;
        }

        this.users[username].progress = {
            ...this.users[username].progress,
            ...progress,
            lastActiveDate: Date.now()
        };

        this.saveUsers();
        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showLoginScreen() {
        document.getElementById('app').style.display = 'none';
        
        // Create login screen if it doesn't exist
        let loginScreen = document.getElementById('loginScreen');
        if (!loginScreen) {
            loginScreen = this.createLoginScreen();
            document.body.appendChild(loginScreen);
        }
        
        loginScreen.style.display = 'flex';
    }    showApp() {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) {
            loginScreen.style.display = 'none';
        }
        
        document.getElementById('app').style.display = 'flex';
        
        // Update user info in the app
        this.updateUserInfo();
        
        // Trigger app initialization
        const authReadyEvent = new CustomEvent('authReady');
        document.dispatchEvent(authReadyEvent);
        
        // Initialize flash card app if it doesn't exist
        if (typeof FlashCardApp !== 'undefined' && !window.flashCardApp) {
            window.flashCardApp = new FlashCardApp();
        }
    }

    updateUserInfo() {
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement && this.currentUser) {
            const user = this.users[this.currentUser];
            const progress = user.progress;
            
            userInfoElement.innerHTML = `
                <div class="user-welcome">Welcome, ${this.currentUser}!</div>
                <div class="user-stats">
                    <span>Known: ${progress.knownIds.length}</span>
                    <span>Learning: ${progress.learningIds.length}</span>
                    <span>Favorites: ${progress.favourites.length}</span>
                </div>
            `;
        }
    }

    createLoginScreen() {
        const loginScreen = document.createElement('div');
        loginScreen.id = 'loginScreen';
        loginScreen.className = 'login-screen';
        
        loginScreen.innerHTML = `
            <div class="login-container">
                <div class="login-header">
                    <h1>🎴 Language Flash Cards</h1>
                    <p>Sign in to save your progress</p>
                </div>
                
                <div class="login-tabs">
                    <button class="tab-btn active" id="loginTab">Sign In</button>
                    <button class="tab-btn" id="registerTab">Sign Up</button>
                </div>
                
                <!-- Login Form -->
                <form class="auth-form" id="loginForm">
                    <div class="form-group">
                        <label for="loginUsername">Username</label>
                        <input type="text" id="loginUsername" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="loginPassword">Password</label>
                        <input type="password" id="loginPassword" required>
                    </div>
                    
                    <button type="submit" class="auth-btn">Sign In</button>
                    
                    <div class="demo-account">
                        <p>Try the demo account:</p>
                        <button type="button" class="demo-btn" id="demoBtn">Use Demo Account</button>
                    </div>
                </form>
                
                <!-- Register Form -->
                <form class="auth-form hidden" id="registerForm">
                    <div class="form-group">
                        <label for="registerUsername">Username</label>
                        <input type="text" id="registerUsername" required minlength="3">
                    </div>
                    
                    <div class="form-group">
                        <label for="registerEmail">Email</label>
                        <input type="email" id="registerEmail" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="registerPassword">Password</label>
                        <input type="password" id="registerPassword" required minlength="6">
                    </div>
                    
                    <div class="form-group">
                        <label for="confirmPassword">Confirm Password</label>
                        <input type="password" id="confirmPassword" required minlength="6">
                    </div>
                    
                    <button type="submit" class="auth-btn">Sign Up</button>
                </form>
                
                <div class="error-message" id="authError"></div>
            </div>
        `;
        
        this.setupLoginEventListeners(loginScreen);
        return loginScreen;
    }

    setupLoginEventListeners(loginScreen) {
        // Tab switching
        const loginTab = loginScreen.querySelector('#loginTab');
        const registerTab = loginScreen.querySelector('#registerTab');
        const loginForm = loginScreen.querySelector('#loginForm');
        const registerForm = loginScreen.querySelector('#registerForm');

        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            this.clearError();
        });

        registerTab.addEventListener('click', () => {
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
            this.clearError();
        });

        // Login form
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register form
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Demo account
        const demoBtn = loginScreen.querySelector('#demoBtn');
        demoBtn.addEventListener('click', () => {
            this.setupDemoAccount();
        });
    }

    handleLogin() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        try {
            this.login(username, password);
            this.showApp();
            this.clearError();
        } catch (error) {
            this.showError(error.message);
        }
    }

    handleRegister() {
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        try {
            this.register(username, password, email);
            this.login(username, password);
            this.showApp();
            this.clearError();
        } catch (error) {
            this.showError(error.message);
        }
    }

    setupDemoAccount() {
        try {
            // Create demo account if it doesn't exist
            if (!this.users['demo']) {
                this.register('demo', 'demo123', 'demo@example.com');
                
                // Add some demo progress
                this.users['demo'].progress = {
                    knownIds: ['1', '3'],
                    learningIds: ['2'],
                    history: [],
                    favourites: ['2', '4'],
                    lastCardIndex: 2,
                    totalSessionTime: 150000,
                    streakDays: 3,
                    lastActiveDate: Date.now()
                };
                this.saveUsers();
            }
            
            this.login('demo', 'demo123');
            this.showApp();
            this.clearError();
        } catch (error) {
            this.showError('Demo account setup failed');
        }
    }

    showError(message) {
        const errorElement = document.getElementById('authError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    clearError() {
        const errorElement = document.getElementById('authError');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    deleteAccount(username = this.currentUser) {
        if (!username || !this.users[username]) {
            throw new Error('User not found');
        }

        delete this.users[username];
        this.saveUsers();
        
        if (username === this.currentUser) {
            this.logout();
        }
        
        return true;
    }

    exportUserData(username = this.currentUser) {
        if (!username || !this.users[username]) {
            return null;
        }

        const userData = {
            username: username,
            email: this.users[username].email,
            progress: this.users[username].progress,
            createdAt: this.users[username].createdAt,
            exportedAt: Date.now()
        };

        return JSON.stringify(userData, null, 2);
    }
}

// Initialize auth manager when DOM is loaded
let authManager;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
