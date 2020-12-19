// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { resolve } from 'dns';
import * as vscode from 'vscode';
const cp = require('child_process');


export function getRoot(): string {
	let rFolder: vscode.Uri;
	let folder: string = "";

	// The code you place here will be executed every time your command is executed
	console.log('name: ' + vscode.workspace.name);
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
			console.log(`stdout: ${stdout}`);
			console.error(`stderr: ${stderr}`);
			resolve(stdout);
		});
	});
}

export async function buildAndLoadDatabase() {
	//	let dir = getRoot();
	await doCLI(`find -name *.c -o -name *.h > cscope.files`);
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
			console.log('selection: ' + text);
			resolve (text);
		});
	};
}

class FuncInfo {
	funcName: string = '';
	fileName: string = '';
	pos: number;
	callers: Array<FuncInfo>;
	callee: Array<FuncInfo>;
	constructor(funcName: string, fileName: string, pos: number) {
		this.funcName = funcName;
		this.fileName = fileName;
		this.pos = pos;
		this.callers = <FuncInfo[]>[];
		this.callee = <FuncInfo[]>[];
	}
}
export function decodeLine(line: string): FuncInfo {
	let lineSplit = line.split(' ');
	lineSplit.forEach(element => {
		console.log('line: ' + element);
	});
	return new FuncInfo(lineSplit[0], lineSplit[1], Number(lineSplit[2]));
}

export async function findCaller() {
	let word = await getWord();
	let definition = await doCLI(`cscope -d -fcscope.out -L1 ${word} `);
	decodeLine(definition as string);
	let data = await doCLI(`cscope -d -fcscope.out -L3 ${word} `);
	console.log('data: ' + data);

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
