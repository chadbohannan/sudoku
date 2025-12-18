class SudokuGame {
    constructor() {
        this.board = null;
        this.solution = null;
        this.initialBoard = null;
        this.selectedCell = null;
        this.difficulty = 'medium';
        this.noteMode = false;
        this.notes = {};
        this.fireworks = null;

        this.initializeBoard();
        this.attachEventListeners();

        // Try to load saved game, otherwise start new game
        if (!this.loadGame()) {
            this.startNewGame();
        }
    }

    saveGame() {
        // Convert notes Sets to arrays for JSON serialization
        const notesForStorage = {};
        for (const [key, value] of Object.entries(this.notes)) {
            if (value instanceof Set) {
                notesForStorage[key] = Array.from(value);
            }
        }

        const gameState = {
            board: this.board,
            solution: this.solution,
            initialBoard: this.initialBoard,
            notes: notesForStorage,
            difficulty: this.difficulty,
            selectedCell: this.selectedCell,
            noteMode: this.noteMode
        };
        localStorage.setItem('sudokuGameState', JSON.stringify(gameState));
    }

    loadGame() {
        try {
            const savedState = localStorage.getItem('sudokuGameState');
            if (!savedState) return false;

            const gameState = JSON.parse(savedState);

            // Validate saved state has required properties
            if (!gameState.board || !gameState.solution || !gameState.initialBoard) {
                return false;
            }

            this.board = gameState.board;
            this.solution = gameState.solution;
            this.initialBoard = gameState.initialBoard;

            // Convert notes from saved format (object with arrays) to Sets
            this.notes = {};
            if (gameState.notes) {
                for (const [key, value] of Object.entries(gameState.notes)) {
                    if (Array.isArray(value)) {
                        // New format: array of numbers
                        this.notes[key] = new Set(value);
                    } else if (typeof value === 'string') {
                        // Legacy format: single string value
                        this.notes[key] = new Set([value]);
                    }
                }
            }

            // Load difficulty, defaulting to 'medium' for invalid/legacy values
            const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
            this.difficulty = validDifficulties.includes(gameState.difficulty)
                ? gameState.difficulty
                : 'medium';

            this.selectedCell = gameState.selectedCell;
            this.noteMode = gameState.noteMode || false;

            // Update UI to match loaded state
            document.getElementById('difficulty-select').value = this.difficulty;
            document.getElementById('note-mode-toggle').checked = this.noteMode;
            this.updateNumberPadStyle();

            this.renderBoard();
            return true;
        } catch (error) {
            console.error('Error loading saved game:', error);
            return false;
        }
    }

    clearSavedGame() {
        localStorage.removeItem('sudokuGameState');
    }

    initializeBoard() {
        const boardElement = document.getElementById('sudoku-board');
        boardElement.innerHTML = '';

        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;
            cell.addEventListener('click', () => this.selectCell(i));
            boardElement.appendChild(cell);
        }
    }

    attachEventListeners() {
        document.getElementById('new-game-btn').addEventListener('click', () => this.startNewGame());
        document.getElementById('hint-btn').addEventListener('click', () => this.showHint());
        document.getElementById('validate-btn').addEventListener('click', () => this.validateBoard());
        document.getElementById('difficulty-select').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.updateDifficultyDisplay();
            this.saveGame();
        });

        document.getElementById('note-mode-toggle').addEventListener('change', (e) => {
            this.noteMode = e.target.checked;
            this.updateNumberPadStyle();
            this.saveGame();
        });

        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const number = btn.dataset.number;
                this.placeNumber(number);
            });
        });
    }

    updateNumberPadStyle() {
        const numberPad = document.querySelector('.number-pad');
        if (this.noteMode) {
            numberPad.classList.add('note-mode');
        } else {
            numberPad.classList.remove('note-mode');
        }
    }

    startNewGame() {
        if (typeof getSudoku === 'undefined') {
            this.showMessage('Loading game library...', 'info');
            setTimeout(() => this.startNewGame(), 500);
            return;
        }

        const result = getSudoku(this.difficulty);

        // Convert '-' to '.' to match our format
        this.initialBoard = result.puzzle.replace(/-/g, '.');
        this.board = this.initialBoard.split('');
        this.solution = result.solution.split('');
        this.notes = {};

        this.renderBoard();
        this.saveGame();
        this.showMessage('New game started! Good luck!', 'info');
        setTimeout(() => this.showMessage('', ''), 2000);
    }

    renderBoard() {
        const cells = document.querySelectorAll('.cell');

        cells.forEach((cell, index) => {
            const value = this.board[index];
            const isGiven = this.initialBoard[index] !== '.';
            const hasNotes = this.notes[index] && this.notes[index].size > 0;

            cell.classList.remove('given', 'user-input', 'note', 'error', 'correct', 'highlighted');

            if (isGiven) {
                cell.textContent = value;
                cell.classList.add('given');
                cell.innerHTML = value; // Reset to text content
            } else if (hasNotes) {
                cell.classList.add('note');
                cell.innerHTML = this.renderNotesGrid(this.notes[index]);
            } else if (value !== '.') {
                cell.textContent = value;
                cell.classList.add('user-input');
                cell.innerHTML = value; // Reset to text content

                // Check for constraint violations
                if (this.hasConstraintViolation(index)) {
                    cell.classList.add('error');
                }
            } else {
                cell.textContent = '';
                cell.innerHTML = '';
            }
        });

        if (this.selectedCell !== null) {
            this.highlightRelatedCells(this.selectedCell);
        }

        // Update number button states
        this.updateNumberButtonStates();
    }

    hasConstraintViolation(cellIndex) {
        const value = this.board[cellIndex];
        if (value === '.') return false;

        const row = Math.floor(cellIndex / 9);
        const col = cellIndex % 9;
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;

        // Check all cells for duplicates in row, column, or box
        for (let i = 0; i < 81; i++) {
            if (i === cellIndex) continue;

            const cellRow = Math.floor(i / 9);
            const cellCol = i % 9;
            const cellBoxRow = Math.floor(cellRow / 3) * 3;
            const cellBoxCol = Math.floor(cellCol / 3) * 3;

            // Check if in same row, column, or box
            if (cellRow === row || cellCol === col ||
                (cellBoxRow === boxRow && cellBoxCol === boxCol)) {

                // If same value found, it's a violation
                if (this.board[i] === value) {
                    return true;
                }
            }
        }

        return false;
    }

    updateNumberButtonStates() {
        // Count occurrences of each number on the board
        const numberCounts = {};
        for (let i = 1; i <= 9; i++) {
            numberCounts[i] = 0;
        }

        this.board.forEach(value => {
            if (value !== '.') {
                numberCounts[value] = (numberCounts[value] || 0) + 1;
            }
        });

        // Update button states
        document.querySelectorAll('.number-btn').forEach(btn => {
            const number = btn.dataset.number;
            if (number && number !== '') {
                if (numberCounts[number] >= 9) {
                    btn.classList.add('completed');
                } else {
                    btn.classList.remove('completed');
                }
            }
        });
    }

    renderNotesGrid(notesSet) {
        // Create a 3x3 grid for notes (positions 1-9)
        const grid = document.createElement('div');
        grid.className = 'notes-grid';

        for (let i = 1; i <= 9; i++) {
            const noteCell = document.createElement('div');
            noteCell.className = 'note-cell';
            if (notesSet.has(String(i))) {
                noteCell.textContent = i;
            }
            grid.appendChild(noteCell);
        }

        return grid.outerHTML;
    }

    selectCell(index) {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => cell.classList.remove('selected', 'highlighted'));

        this.selectedCell = index;
        cells[index].classList.add('selected');
        this.highlightRelatedCells(index);
        this.saveGame();
    }

    highlightRelatedCells(index) {
        const row = Math.floor(index / 9);
        const col = index % 9;
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        const currentValue = this.board[index];

        const cells = document.querySelectorAll('.cell');

        cells.forEach((cell, i) => {
            const cellRow = Math.floor(i / 9);
            const cellCol = i % 9;
            const cellBoxRow = Math.floor(cellRow / 3) * 3;
            const cellBoxCol = Math.floor(cellCol / 3) * 3;

            if (i === index) return;

            if (cellRow === row || cellCol === col ||
                (cellBoxRow === boxRow && cellBoxCol === boxCol)) {
                cell.classList.add('highlighted');
            }

            if (currentValue !== '.' && this.board[i] === currentValue) {
                cell.classList.add('highlighted');
            }
        });
    }

    placeNumber(number) {
        if (this.selectedCell === null) {
            this.showMessage('Please select a cell first', 'info');
            setTimeout(() => this.showMessage('', ''), 2000);
            return;
        }

        if (this.initialBoard[this.selectedCell] !== '.') {
            return;
        }

        if (this.noteMode) {
            if (number === '') {
                // Erase button clears all notes and the cell value
                delete this.notes[this.selectedCell];
                this.board[this.selectedCell] = '.';
            } else {
                // Toggle the note: add if not present, remove if present
                if (!this.notes[this.selectedCell]) {
                    this.notes[this.selectedCell] = new Set();
                }

                if (this.notes[this.selectedCell].has(number)) {
                    this.notes[this.selectedCell].delete(number);
                    // Clean up empty Sets
                    if (this.notes[this.selectedCell].size === 0) {
                        delete this.notes[this.selectedCell];
                    }
                } else {
                    this.notes[this.selectedCell].add(number);
                }

                // Clear the actual value when adding notes
                this.board[this.selectedCell] = '.';
            }
        } else {
            // In normal mode, clear notes and place the number
            delete this.notes[this.selectedCell];
            this.board[this.selectedCell] = number === '' ? '.' : number;

            // If a number was placed (not erased), eliminate it from related cells' notes
            if (number !== '') {
                this.eliminateNotesInRelatedCells(this.selectedCell, number);
            }
        }

        this.renderBoard();
        this.saveGame();

        if (!this.noteMode && !this.board.includes('.')) {
            this.checkWin();
        }
    }

    eliminateNotesInRelatedCells(cellIndex, number) {
        const row = Math.floor(cellIndex / 9);
        const col = cellIndex % 9;
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;

        // Check all cells and remove the number from notes if they're in the same row, column, or box
        for (let i = 0; i < 81; i++) {
            if (i === cellIndex) continue;

            const cellRow = Math.floor(i / 9);
            const cellCol = i % 9;
            const cellBoxRow = Math.floor(cellRow / 3) * 3;
            const cellBoxCol = Math.floor(cellCol / 3) * 3;

            // Check if cell is in same row, column, or box
            if (cellRow === row || cellCol === col ||
                (cellBoxRow === boxRow && cellBoxCol === boxCol)) {

                if (this.notes[i] && this.notes[i].has(number)) {
                    this.notes[i].delete(number);
                    // Clean up empty Sets
                    if (this.notes[i].size === 0) {
                        delete this.notes[i];
                    }
                }
            }
        }
    }

    showHint() {
        const emptyCells = [];
        this.board.forEach((value, index) => {
            if (value === '.' && this.initialBoard[index] === '.') {
                emptyCells.push(index);
            }
        });

        if (emptyCells.length === 0) {
            this.showMessage('No empty cells to hint!', 'info');
            setTimeout(() => this.showMessage('', ''), 2000);
            return;
        }

        const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const hintNumber = this.solution[randomIndex];
        this.board[randomIndex] = hintNumber;
        delete this.notes[randomIndex];

        // Eliminate the hint number from related cells' notes
        this.eliminateNotesInRelatedCells(randomIndex, hintNumber);

        this.selectCell(randomIndex);
        this.renderBoard();
        this.saveGame();

        this.showMessage('Hint provided!', 'info');
        setTimeout(() => this.showMessage('', ''), 2000);

        if (!this.board.includes('.')) {
            this.checkWin();
        }
    }

    validateBoard() {
        let hasErrors = false;
        const cells = document.querySelectorAll('.cell');

        cells.forEach((cell, index) => {
            cell.classList.remove('error', 'correct');

            if (this.board[index] !== '.' && this.initialBoard[index] === '.') {
                if (this.board[index] === this.solution[index]) {
                    cell.classList.add('correct');
                } else {
                    cell.classList.add('error');
                    hasErrors = true;
                }
            }
        });

        if (hasErrors) {
            this.showMessage('Some numbers are incorrect (shown in red)', 'error');
        } else {
            this.showMessage('All filled numbers are correct!', 'success');
        }

        setTimeout(() => {
            cells.forEach(cell => cell.classList.remove('error', 'correct'));
            this.renderBoard();
            this.showMessage('', '');
        }, 3000);
    }

    checkWin() {
        const isCorrect = this.board.every((value, index) => value === this.solution[index]);

        if (isCorrect) {
            this.showMessage('Congratulations! You solved it!', 'success');
            this.clearSavedGame();
            this.celebrateWin();
        } else {
            this.showMessage('Puzzle complete, but some numbers are wrong. Try again!', 'error');
            setTimeout(() => this.showMessage('', ''), 3000);
        }
    }

    celebrateWin() {
        const container = document.getElementById('fireworks-container');

        // Show the fireworks container
        container.classList.add('active');

        // Initialize fireworks if not already done
        if (!this.fireworks && window.Fireworks) {
            this.fireworks = new window.Fireworks(container, {
                rocketsPoint: {
                    min: 0,
                    max: 100
                },
                hue: {
                    min: 0,
                    max: 360
                },
                delay: {
                    min: 15,
                    max: 30
                },
                speed: 2,
                acceleration: 1.05,
                friction: 0.95,
                gravity: 1.5,
                particles: 90,
                trace: 3,
                explosion: 6,
                autoresize: true,
                brightness: {
                    min: 50,
                    max: 80
                },
                boundaries: {
                    top: 50,
                    bottom: container.clientHeight,
                    left: 50,
                    right: container.clientWidth
                }
            });
        }

        // Start the fireworks
        if (this.fireworks) {
            this.fireworks.start();
        }

        // After 5 seconds, fade out and stop
        setTimeout(() => {
            container.classList.remove('active');
            setTimeout(() => {
                if (this.fireworks) {
                    this.fireworks.stop();
                }
            }, 500); // Wait for fade transition to complete
        }, 5000);
    }


    showMessage(text, type) {
        const messageEl = document.getElementById('message');
        messageEl.textContent = text;
        messageEl.className = 'message';
        if (type) {
            messageEl.classList.add(type);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new SudokuGame();
});
