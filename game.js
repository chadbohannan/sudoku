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
        this.startNewGame();
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
        });

        document.getElementById('note-mode-toggle').addEventListener('change', (e) => {
            this.noteMode = e.target.checked;
            this.updateNumberPadStyle();
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
        if (typeof sudoku === 'undefined') {
            this.showMessage('Loading game library...', 'info');
            setTimeout(() => this.startNewGame(), 500);
            return;
        }

        const puzzleString = sudoku.generate(this.difficulty);
        this.initialBoard = puzzleString;
        this.board = puzzleString.split('');
        this.solution = sudoku.solve(puzzleString).split('');
        this.notes = {};

        this.renderBoard();
        this.showMessage('New game started! Good luck!', 'info');
        setTimeout(() => this.showMessage('', ''), 2000);
    }

    renderBoard() {
        const cells = document.querySelectorAll('.cell');

        cells.forEach((cell, index) => {
            const value = this.board[index];
            const isGiven = this.initialBoard[index] !== '.';
            const hasNote = this.notes[index];

            cell.classList.remove('given', 'user-input', 'note', 'error', 'correct', 'highlighted');

            if (isGiven) {
                cell.textContent = value;
                cell.classList.add('given');
            } else if (hasNote) {
                cell.textContent = hasNote;
                cell.classList.add('note');
            } else if (value !== '.') {
                cell.textContent = value;
                cell.classList.add('user-input');
            } else {
                cell.textContent = '';
            }
        });

        if (this.selectedCell !== null) {
            this.highlightRelatedCells(this.selectedCell);
        }
    }

    selectCell(index) {
        if (this.initialBoard[index] !== '.') {
            return;
        }

        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => cell.classList.remove('selected', 'highlighted'));

        this.selectedCell = index;
        cells[index].classList.add('selected');
        this.highlightRelatedCells(index);
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
                delete this.notes[this.selectedCell];
            } else {
                this.notes[this.selectedCell] = number;
                this.board[this.selectedCell] = '.';
            }
        } else {
            delete this.notes[this.selectedCell];
            this.board[this.selectedCell] = number === '' ? '.' : number;
        }

        this.renderBoard();

        if (!this.noteMode && !this.board.includes('.')) {
            this.checkWin();
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
        this.board[randomIndex] = this.solution[randomIndex];
        delete this.notes[randomIndex];
        this.selectCell(randomIndex);
        this.renderBoard();

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
