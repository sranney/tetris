const canvas = document.getElementById('tetris');
const context = canvas.getContext("2d");

context.scale(20,20);
let level = 1;
function arenaSweep() {//for clearing rows that have been completed
	let rowCount = 1;
	outer: for (let y=arena.length - 1; y>0 ; --y){//iterating from bottom to top
		for (let x=0; x< arena[y].length; ++x){//iterating from left to right within a particular row y
			if(arena[y][x] === 0) {//if a combination of y and x are blank than this row is not complete
				continue outer;
			}
		}
		//take the row that is filled out and replace with 0s, thus representing an empty row
		const row = arena.splice(y,1)[0].fill(0);
		//after that, reinsert the row that was taken out at the top of the array
		arena.unshift(row);
		++y;

		player.score += rowCount * 10; //increase the score
		rowCount *= 2;//to double the score for ever row cleared
		if(player.score > 400 * level){//check the score against the level constraints (increments of 400) increasing speed of the piece drops based on level
			dropInterval -=70;
			level++;
		}
	}
}

function collide(arena,player){//detecting collision with other pieces or the walls of the arena
	const [m,o] = [player.matrix,player.pos];
	for (let y = 0 ; y < m.length; ++y){
		for (let x = 0 ; x < m[y].length; ++x){
			if(m[y][x] !== 0 && 
				(arena[y+o.y] && arena[y+o.y][x+o.x])!==0){
				return true;//returns true if there is a collision
			}
		}
	}
	return false;//returns false if no collision
}

function createMatrix(w,h){//this creates the matrix which is essentially the back end of the canvas board 
//it gets updated with non-zero numbers in the columns(w) and rows(h) where blocks have been placed
//the matrix is used to keep blocks from overlapping and to check for filled rows
	const matrix = [];
	while(h--){
		matrix.push(new Array(w).fill(0))
	}
	return matrix;
}

//shapes - make a 2d matrix - shapes are dynamic and need to be rotated
//the ones are the colored squares
function createPiece(type){
	if (type === "T"){
		return [
			[0,0,0],//the extra row facilitates rotating pieces and finding center
			[1,1,1],
			[0,1,0]
		];		
	} else if (type === "O"){
		return [
			[2,2],//no rotating with this object
			[2,2]
		];
	} else if (type ==="L"){
		return [
			[0,3,0],//the extra column facilitates rotating pieces and finding center
			[0,3,0],
			[0,3,3]
		];
	} else if (type ==="J"){
		return [
			[0,4,0],//the extra column facilitates rotating pieces and finding center
			[0,4,0],
			[4,4,0]
		];
	} else if (type ==="I"){
		return [
			[0,5,0,0],//the extra columns facilitate rotating pieces and finding center
			[0,5,0,0],
			[0,5,0,0],
			[0,5,0,0]
		];
	} else if (type ==="S"){
		return [
			[0,0,0],//the extra row facilitates rotating pieces and finding center
			[0,6,6],
			[6,6,0]
		];
	} else if (type ==="Z"){
		return [
			[0,0,0],//the extra row facilitates rotating pieces and finding center
			[7,7,0],
			[0,7,7]
		];
	}
}

function draw(){
	//first resets canvas each time and then draws arena which is full of already placed pieces and then
	//draws dropping player pieces
	context.fillStyle = "#000";//make background black
	context.fillRect(0,0,canvas.width,canvas.height);//make canvas background
	drawMatrix(arena,{x:0,y:0});
	drawMatrix(player.matrix,player.pos);	
}

function drawMatrix(matrix,offset){//actually draws matrix and shapes
	//the order in which draw calls drawMatrix with the "canvas" related arena object and then the player object 
	//has the arena drawn first and then the player
	matrix.forEach((row,y) =>{//draws a canvas for each element in the array
		row.forEach((value,x) =>{
			if(value !== 0){
				context.fillStyle = colors[value];//different numbers have different colors because of the different shapes
				//
				context.fillRect(x+offset.x,
								y + offset.y,
								1,1);
			}
		});
	});
}

function merge(arena,player){//once blocks reach bottom of game window, this function allows blocks to stick
	//updates arena to the shape values in the player.matrix block
	player.matrix.forEach((row,y) =>{
		row.forEach((value,x) =>{
			if(value!==0){
				arena[y + player.pos.y][x+player.pos.x] = value;
			}
		})
	})
}

function playerDrop(){//moving down
	player.pos.y++;//creates downward motion
	if(collide(arena,player)){
		player.pos.y--;//prevents blocks from going out of canvas window
		merge(arena,player);
		playerReset();
		arenaSweep();
		updateScoreAndLevel();
	}
	dropCounter = 0;//resets dropCounter for next block - this is then incremented by deltaTime in update 
	//function until a second has passed and then this function is part of a conditional block
}

function playerMove(dir){//moving left and right
	player.pos.x+=dir;
	if(collide(arena,player)){//collision detection - if true, push piece back one in the direction that the player moved the piece
		player.pos.x-=dir;
	}
}

function playerReset(){//reset to new random piece
	const pieces = "ILJOTSZ";//add new piece
	player.matrix = createPiece(pieces[pieces.length * Math.random()|0]);
	player.pos.y = 0; 
	player.pos.x = (arena[0].length / 2 | 0 ) - 
					(player.matrix[0].length / 2 | 0);
	if(collide(arena,player)){//if the newly added piece already collides with pieces this means game over so reset
		arena.forEach(row => row.fill(0));//reset screen and erase all blocks - blocks are numbers greater than 1
		dropInterval = 1000;//reset speed to be normal
		player.score = 0;//reset score to 0
		level = 1;
		updateScoreAndLevel();//and update score
	}
}

function playerRotate(dir){//function for rotating piece based on direction
	//checks for collision and rejects rotates that would result in collision
	const pos = player.pos.x;
	let offset = 1;
	rotate(player.matrix,dir);
	while(collide(arena,player)){
		player.pos.x+=offset;
		offset=-(offset+(offset > 0 ? 1: -1));
		if(offset > player.matrix[0].length){
			rotate(player.matrix,-dir);
			player.pos.x = pos;
			return;
		}
	}
}

function rotate(matrix,dir){//rotate the pieces in the canvas
	for (let y = 0 ; y < matrix.length; ++y){
		for (let x = 0 ; x < y; ++x) {
			//tuple switch - based on swap method [x,y] = [y,x]
			[
				matrix[x][y],
				matrix[y][x]
			] = [
				matrix[y][x],
				matrix[x][y]
			]
		}
	}

	if(dir > 0){//collision detection
		matrix.forEach(row => row.reverse());
	} else {
		matrix.reverse();
	}
}

let dropCounter = 0;//canvas animation data
let dropInterval = 1000;//one second drop interval at first - after every newly achieved level, this is decremented

let lastTime = 0;
function update(time = 0) {//function to update the canvas to match the representation of the canvas
	const deltaTime = time - lastTime;
	lastTime = time;
	dropCounter += deltaTime;
	if(dropCounter > dropInterval){
		playerDrop();
	}

	draw();
	requestAnimationFrame(update);
}

function updateScoreAndLevel(){//updating dom elements for score and level
	document.getElementById("score").innerText = "Score: " + player.score;
	document.getElementById("level").innerText = "Level: " + level;
}

const colors = [//getting colorful pieces
	null,
	"#FF0D72",
	"#0DC2FF",
	"#0DFF72",
	"#F538FF",
	"#FF8E0D",
	"#FFE138",
	"#3877FF"
]

const arena = createMatrix(12,20);//creating a matrix representation of game play

const player = {//function for  starting position
	pos:{x:5,y:5},
	matrix:null,
	score: 0,
}

document.addEventListener("keydown",event =>{//handling keydown events
	if(event.keyCode == 37){//move left with left arrow key
		playerMove(-1);
	} else if(event.keyCode == 39){//move right with right arrow key
		playerMove(1);
	} else if(event.keyCode == 40){//move down with down arrow key
		playerDrop();
	} else if(event.keyCode == 81){//rotate clockwise with "q" key
		playerRotate(-1);
	} else if(event.keyCode == 87){//rotate counter-clockwise with "w" key
		playerRotate(1);
	}
})

//functions for setting up a game instance
playerReset();
updateScoreAndLevel();
update();