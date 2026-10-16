import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

interface MonacoEnvironment {
  getWorker(workerId: string, label: string): Worker;
}

interface MonacoGlobal {
  MonacoEnvironment?: MonacoEnvironment;
}

const monacoGlobal = self as MonacoGlobal;

monacoGlobal.MonacoEnvironment = {
  getWorker(workerId: string, label: string): Worker {
    if (label === "json") {
      return new jsonWorker();
    }
    if (label === "typescript" || label === "javascript") {
      return new tsWorker();
    }
    return new editorWorker();
  },
};
