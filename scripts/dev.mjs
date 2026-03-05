import { spawn } from "child_process";

let vscode = null;
let tscWatch = null;

function launchVSCode() {
	if (vscode) {
		console.log("\n[dev] Closing VS Code...");
		vscode.kill();
		vscode = null;
	}

	console.log("[dev] Launching VS Code with temp profile...");
	vscode = spawn(
		"code",
		["--extensionDevelopmentPath", process.cwd(), "--profile-temp"],
		{ stdio: "ignore" }
	);

	vscode.on("exit", () => {
		vscode = null;
	});
}

function startTscWatch() {
	tscWatch = spawn("npx", ["tsc", "-watch", "-p", "./"], {
		stdio: "inherit",
	});
}

function cleanup() {
	if (vscode) vscode.kill();
	if (tscWatch) tscWatch.kill();
	process.exit();
}

// Initial compile
console.log("[dev] Compiling...");
const compile = spawn("npx", ["tsc", "-p", "./"], { stdio: "inherit" });

compile.on("exit", (code) => {
	if (code !== 0) {
		console.error("[dev] Compile failed, launching anyway...");
	}

	launchVSCode();
	startTscWatch();

	console.log("\n[dev] Press 'r' to restart VS Code, 'q' to quit\n");

	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.on("data", (key) => {
		const char = key.toString();
		if (char === "r") {
			launchVSCode();
		} else if (char === "q" || char === "\u0003") {
			// q or ctrl+c
			cleanup();
		}
	});
});

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
