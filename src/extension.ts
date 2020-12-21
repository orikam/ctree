// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { resolve } from 'dns';
import { Func } from 'mocha';
import * as vscode from 'vscode';
const cp = require('child_process');


export function getRoot(): string {
	let rFolder: vscode.Uri;
	let folder: string = "";

	// The code you place here will be executed every time your command is executed
	if (vscode.workspace.workspaceFolders !== undefined) {
		rFolder = vscode.workspace.workspaceFolders[0].uri;
		folder = rFolder.toString();
		folder = folder.replace('file:', '');

	}
	return folder;
}

export function doCLI(command: string) {

	console.log('command: ' + command);
	let dir = getRoot();
	return new Promise((resolve, reject) => {
		cp.exec(command, { cwd: dir }, (error: string, stdout: string, stderr: string) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			//console.log(`stdout: ${stdout}`);
			//console.error(`stderr: ${stderr}`);
			resolve(stdout);
		});
	});
}

export async function buildAndLoadDatabase() {
	//	let dir = getRoot();
	await doCLI(`find . -name *.c -o -name *.h > cscope.files`);
	await doCLI(`cscope -b -R -i cscope.files`);
	//await doCLI(`mv cscope.out cscope.out`);

	/*
	let dir = getRoot();
	await doCLI(`find ${dir} -name *.c -o -name *.h > ${dir}/cscope.files`);
	await doCLI(`cscope -b -R -i ${dir}/cscope.files`);
	await doCLI(`mv cscope.out ${dir}/cscope.out`);
	*/
	return ('build done');
}

export function getWord() {
	return new Promise((resolve, reject) => {
		vscode.commands.executeCommand('editor.action.addSelectionToNextFindMatch').then(() => {
			const editor = vscode.window.activeTextEditor;
			{
				if (!editor) {
					vscode.window.showInformationMessage('NO text editor selected');
					return;
				}
			}
			const text = editor.document.getText(editor.selection);
			//console.log('selection: ' + text);
			resolve (text);
		});
	});
}

class FuncInfo {
	funcName: string = '';
	fileName: string = '';
	desc: string = '';
	pos: number;
	callee: Array<Callee>;

	constructor(funcName: string, fileName: string, pos: number) {
		this.funcName = funcName;
		this.fileName = fileName;
		this.pos = pos;
		this.callee = <Callee[]>[];
	}
}

class Callee {
	funcInfo: FuncInfo;
	pos: Number;
	desc: String;

	constructor(func:FuncInfo, pos:Number, desc:String) {
		this.funcInfo = func;
		this.pos = pos;
		this.desc = desc;
	}
}


interface Dictionary<T> {
	[Key: string]: T;
}

let dFunctions:Dictionary<FuncInfo>;


export function decodeLine(line: string): FuncInfo {
	let lineSplit = line.split(' ');
	//lineSplit.forEach(element => {
		//console.log('line: ' + element);
	//});
	return new FuncInfo(lineSplit[1], lineSplit[0], Number(lineSplit[2]));
}

/*
export function decodeCaller(line: string): Callee {
	let lineSplit = line.split(' ', 4);
	
	return new Callee(dFunctions[tempCaller.funcName];, lineSplit[0], Number(lineSplit[2]));
}
*/

export async function buildGraph(funcName:string, rootArray:Array<FuncInfo>) {

	let definition = await doCLI(`cscope -d -fcscope.out -L1 ${funcName} `);
	let base = decodeLine(definition as string);
	console.log('ooOri callee: ' + base.funcName);
	dFunctions[base.funcName] = base;

	// Find caller functions
	let data:string = await doCLI(`cscope -d -fcscope.out -L3 ${funcName} `) as string;
	// If no caller it means it is root.
	let lines = data.split('\n');
	if(lines.length <= 1) {
		rootArray.push(base);
		return;
	}

	for(let i:number = 0; i < lines.length; i++) {
		let line = lines[i];
		let info:FuncInfo;
		if(line.length > 3) {
			console.log('ooOri caller: ' + line);
			let tempCaller = decodeLine(line);
			let caller = dFunctions[tempCaller.funcName];
			if (caller == null) {
				await buildGraph(tempCaller.funcName, rootArray);
				caller = dFunctions[tempCaller.funcName];
			}
			let callee = new Callee(dFunctions[base.funcName], tempCaller.pos, tempCaller.desc);
			caller.callee.push(callee);
			
		}

	};
	return;
}

let rootGraph:Array<FuncInfo> = <FuncInfo[]>[];

export function showTree(offset:string, funcInfo:FuncInfo) {
	console.log(offset + ' ' ,funcInfo.funcName);
	funcInfo.callee.forEach(callee => {
		showTree(offset + '+', callee.funcInfo);
	});
}

export async function findCaller() {
	dFunctions = {};
	rootGraph = [];
	let word = await getWord();
	let definition = await doCLI(`cscope -d -fcscope.out -L1 ${word} `);
	let base = decodeLine(definition as string);
	await buildGraph(base.funcName, rootGraph).then(() => {
		rootGraph.forEach(element => {
			showTree('+', element);
		});
	});
	
	

	

}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ctree" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('ctree.build', () => {
		let rFolder: vscode.Uri;
		let folder: string;

		// The code you place here will be executed every time your command is executed
		console.log('name: ' + vscode.workspace.name);
		if (vscode.workspace.workspaceFolders !== undefined) {
			rFolder = vscode.workspace.workspaceFolders[0].uri;
			folder = rFolder.toString();
			folder = folder.replace('file:', '');
			console.log('root: ' + rFolder);
			console.log('root string: ' + folder);
		}



		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from ctree!');
		//buildDatabase();
		buildAndLoadDatabase().then(() => {
			console.log('done:');
			vscode.window.showInformationMessage('Done building database');
		});
		/*
				let createFileList = new Promise((resolve, reject) => {
					cp.execSync(`find ${folder} -name *.c -o -name *.h > ${folder}/cscope.files`);
					cp.execSync(`cscope -R -i ${folder}/cscope.files`);
					cp.execSync(`mv cscope.out ${folder}/cscope.out`);
					resolve('OK');
				}).then(() => {
					console.log('done:');
					vscode.window.showInformationMessage('Done building!');
					vscode.window.showInformationMessage('Done building!!!!');
				});
		*/

	});

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('ctree.findcaller', findCaller);
	context.subscriptions.push(disposable);

}

// this method is called when your extension is deactivated
export function deactivate() { }
