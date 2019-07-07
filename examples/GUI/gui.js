var execBtn = document.getElementById("execute");
var outputElm = document.getElementById('output');
var errorElm = document.getElementById('error');
var commandsElm = document.getElementById('commands');
var dbFileElm = document.getElementById('dbfile');
var savedbElm = document.getElementById('savedb');

// Start the worker in which sql.js will run
var worker = new Worker("../../dist/worker.sql-wasm-debug.js");
worker.onerror = error;

// Open a database
worker.postMessage({ action: 'open' });

// Connect to the HTML element we 'print' to
function print(text) {
	outputElm.innerHTML = text.replace(/\n/g, '<br>');
}

function loadBookDB() {
	commands = "PRAGMA foreign_keys=OFF; \
	DROP TABLE IF EXISTS Players; \
	CREATE TABLE Players( 		\
      		playerID integer,  			\
      		name varchar(255),                 	\
      		level integer,				\
      		guildMember integer,				\
      		leadsGuild integer,				\
      		coins integer,				\
		FOREIGN KEY (guildMember) REFERENCES Guilds(guildID)	\
		FOREIGN KEY (leadsGuild) REFERENCES Guilds(guildID)	\
	);						\
	CREATE TABLE Guilds( 				\
      		guildID integer,  			\
      		name    varchar(255),                 	\
      		level integer,				\
		dateCreated date,			\
		leader integer,				\
		FOREIGN KEY (leader) REFERENCES Players(playerID)	\
	);						\
	CREATE TABLE Items( 				\
      		itemID integer,  			\
      		name    varchar(255),                 	\
      		minLevel integer,				\
		type VARCHAR(255),			\
		handedness int				\
	);						\
	CREATE TABLE GuildTreasury ( 				\
      		guildID integer,  			\
      		itemID integer,                 	\
		FOREIGN KEY (guildID) REFERENCES Guilds(guildID),	\
		FOREIGN KEY (itemID) REFERENCES Items(itemID)	\
	);						\
  INSERT INTO Players VALUES (1, 'Elyse', 21, 10, 10, 1234); \
  INSERT INTO Players VALUES (2, 'Alyma', 18, 20, 20, 2133); \
  INSERT INTO Players VALUES (3, 'Kennis', 8, 10, NULL, 553); \
  INSERT INTO Players VALUES (4, 'Blothie', 2, 20, NULL, 120); \
  INSERT INTO Players VALUES (5, 'Radix', 8, 20, NULL, 429); \
  INSERT INTO Players VALUES (6, 'Apl', 1, NULL, NULL, 15); \
  INSERT INTO Players VALUES (7, 'Babbage', 2, 20, NULL, 111); \
  INSERT INTO Guilds VALUES (10, 'Grey Warriors', 20, '2019-05-03', 1); \
  INSERT INTO Guilds VALUES (20, 'Shocking Power', 18, '2019-05-04', 2); \
  INSERT INTO Guilds VALUES (30, 'Shimmering Light', 1, '2019-04-19', NULL); \
  INSERT INTO Guilds VALUES (40, 'Gray Wolf Clan', 2, '2019-04-20', NULL); \
  INSERT INTO Guilds VALUES (50, 'Winds of Grey', 4, '2019-04-25', NULL); \
  INSERT INTO Guilds VALUES (60, 'Grey Mountaineers', 7, '2019-06-01', NULL); \
  INSERT INTO Guilds VALUES (70, 'Bitter Power Pals', 3, '2019-04-25', NULL); \
  INSERT INTO Guilds VALUES (80, 'Vengeful Warriors', 4, '2019-05-11', NULL); \
  INSERT INTO Items VALUES (100, 'Iron Sword', 5, 'sword', 1); \
  INSERT INTO Items VALUES (200, 'Steel Battleaxe', 8, 'axe', 2); \
  INSERT INTO Items VALUES (300, 'Steel Bow', 7, 'bow', 2); \
  INSERT INTO Items VALUES (400, 'Bronze Axe', 10, 'axe', 1); \
  INSERT INTO Items VALUES (500, 'Bronze Bow', 10, 'bow', 2); \
  INSERT INTO GuildTreasury VALUES (10, 100); \
  INSERT INTO GuildTreasury VALUES (20, 100); \
  INSERT INTO GuildTreasury VALUES (20, 200); \
  PRAGMA foreign_keys=ON; \
";
	worker.postMessage({ action: 'exec', sql: commands });
}
function error(e) {
	console.log(e);
	errorElm.style.height = '2em';
	errorElm.textContent = e.message;
}

function noerror() {
	errorElm.style.height = '0';
}

// Run a command in the database
function execute(commands) {
	tic();
	worker.onmessage = function (event) {
		if (event.data.error)
		{
			event.message = event.data.error;
			error(event);
		}

		var results = event.data.results;
		toc("Executing SQL");

		tic();
		outputElm.innerHTML = "";
		for (var i = 0; i < results.length; i++) {
			outputElm.appendChild(tableCreate(results[i].columns, results[i].values));
		}
		toc("Displaying results");
	}
	
	worker.postMessage({ action: 'exec', sql: commands });
	outputElm.textContent = "Fetching results...";
}

// Create an HTML table
var tableCreate = function () {
	function valconcat(vals, tagName) {
		if (vals.length === 0) return '';
		var open = '<' + tagName + '>', close = '</' + tagName + '>';
		return open + vals.join(close + open) + close;
	}
	return function (columns, values) {
		var tbl = document.createElement('table');
		var html = '<thead>' + valconcat(columns, 'th') + '</thead>';
		var rows = values.map(function (v) { return valconcat(v, 'td'); });
		html += '<tbody>' + valconcat(rows, 'tr') + '</tbody>';
		tbl.innerHTML = html;
		return tbl;
	}
}();

// Execute the commands when the button is clicked
function execEditorContents() {
	noerror()
	execute(editor.getValue() + ';');
}
execBtn.addEventListener("click", execEditorContents, true);

// Performance measurement functions
var tictime;
if (!window.performance || !performance.now) { window.performance = { now: Date.now } }
function tic() { tictime = performance.now() }
function toc(msg) {
	var dt = performance.now() - tictime;
	console.log((msg || 'toc') + ": " + dt + "ms");
}

// Add syntax highlihjting to the textarea
var editor = CodeMirror.fromTextArea(commandsElm, {
	mode: 'text/x-mysql',
	viewportMargin: Infinity,
	indentWithTabs: true,
	smartIndent: true,
	lineNumbers: true,
	matchBrackets: true,
	autofocus: true,
	extraKeys: {
		"Ctrl-Enter": execEditorContents,
		//"Ctrl-S": savedb,
	}
});

/*
// Not loading or saving anymore
// Load a db from a file
dbFileElm.onchange = function () {
	var f = dbFileElm.files[0];
	var r = new FileReader();
	r.onload = function () {
		worker.onmessage = function () {
			toc("Loading database from file");
			// Show the schema of the loaded database
			editor.setValue("SELECT `name`, `sql`\n  FROM `sqlite_master`\n  WHERE type='table';");
			execEditorContents();
		};
		tic();
		try {
			worker.postMessage({ action: 'open', buffer: r.result }, [r.result]);
		}
		catch (exception) {
			worker.postMessage({ action: 'open', buffer: r.result });
		}
	}
	r.readAsArrayBuffer(f);
}

// Save the db to a file
function savedb() {
	worker.onmessage = function (event) {
		toc("Exporting the database");
		var arraybuff = event.data.buffer;
		var blob = new Blob([arraybuff]);
		var a = document.createElement("a");
		document.body.appendChild(a);
		a.href = window.URL.createObjectURL(blob);
		a.download = "sql.db";
		a.onclick = function () {
			setTimeout(function () {
				window.URL.revokeObjectURL(a.href);
			}, 1500);
		};
		a.click();
	};
	tic();
	worker.postMessage({ action: 'export' });
}
savedbElm.addEventListener("click", savedb, true);
*/
