import Palette from "./components/Palette";
import Canvas from "./components/Canvas";
import Inspector from "./components/Inspector";
import OutputPanel from "./components/OutputPanel";
import BuildRunBar from "./components/BuildRunBar";

export default function App() {
  return (
    <div className="h-full flex flex-col">
      <BuildRunBar />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-48">
          <Palette />
        </div>
        <div className="flex-1 overflow-hidden">
          <Canvas />
        </div>
        <div className="w-64 border-l overflow-y-auto">
          <Inspector />
        </div>
      </div>
      <div className="h-32 border-t">
        <OutputPanel />
      </div>
    </div>
  );
}

