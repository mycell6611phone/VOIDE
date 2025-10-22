import "@testing-library/jest-dom/vitest";
import React from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import type { FlowDef } from "@voide/shared";
import RunControls from "../RunControls";
import { useFlowStore } from "../../state/flowStore";
import { createInitialFlow } from "../../constants/mockLayout";

const renderControls = () => render(<RunControls />);

const createFileList = (file: File): FileList =>
  ({
    0: file,
    length: 1,
    item: (index: number) => (index === 0 ? file : null)
  } as unknown as FileList);

const exitAppMock = vi.fn().mockResolvedValue({ ok: true });
const secretSetMock = vi.fn().mockResolvedValue({ ok: true });
const selectLlamaBinaryMock = vi.fn().mockResolvedValue({ path: "/tmp/llama-cli" });
let buildFlowMock: ReturnType<typeof vi.fn>;
let runBuiltFlowMock: ReturnType<typeof vi.fn>;
let stopActiveRunMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  const initialFlow = createInitialFlow();
  buildFlowMock = vi.fn().mockResolvedValue({ ok: true, hash: "hash:test" });
  runBuiltFlowMock = vi.fn().mockResolvedValue({ ok: true });
  stopActiveRunMock = vi.fn().mockResolvedValue({ ok: true });
  useFlowStore.setState({
    flow: initialFlow,
    compiledFlow: null,
    buildStatus: "idle",
    buildError: null,
    lastBuildAt: null,
    runStatus: "idle",
    runError: null,
    activeRunId: null,
    lastRunId: null,
    lastRunCompletedAt: null,
    lastRunOutputs: [],
    catalog: [],
    activeTool: "select",
    clipboard: null,
    buildFlow: buildFlowMock,
    runBuiltFlow: runBuiltFlowMock,
    stopActiveRun: stopActiveRunMock,
  });
  exitAppMock.mockReset();
  secretSetMock.mockReset();
  selectLlamaBinaryMock.mockReset();
  (window as unknown as {
    voide?: {
      exitApp: typeof exitAppMock;
      secretSet: typeof secretSetMock;
      selectLlamaBinary: typeof selectLlamaBinaryMock;
    };
  }).voide = {
    exitApp: exitAppMock,
    secretSet: secretSetMock,
    selectLlamaBinary: selectLlamaBinaryMock,
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (window as { voide?: unknown }).voide;
});

describe("RunControls file menu", () => {
  it("renders the file menu items when opened", () => {
    renderControls();

    const trigger = screen.getByRole("button", { name: "File" });
    fireEvent.click(trigger);

    const menu = screen.getByTestId("file-menu-panel");
    expect(menu).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Open/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Close/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Save/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Export/ })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: /Project/ })).toBeNull();
    expect(screen.getByRole("menuitem", { name: /Working Directory/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Select llama\.cpp Binary/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Compute/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /^Exit/ })).toBeTruthy();
  });

  it("invokes the llama binary selector from the file menu", async () => {
    renderControls();

    const trigger = screen.getByRole("button", { name: "File" });
    fireEvent.click(trigger);

    const selector = screen.getByRole("menuitem", { name: /Select llama\.cpp Binary/ });
    fireEvent.click(selector);

    await waitFor(() => {
      expect(selectLlamaBinaryMock).toHaveBeenCalledTimes(1);
    });
  });

  it("opens a project file and updates the flow store", async () => {
    renderControls();

    const projectFile: FlowDef = {
      id: "flow:test-open",
      version: "1.0.0",
      nodes: [],
      edges: [],
      prompts: { packs: [] },
      models: { registryRef: "" },
      profiles: {}
    };

    const input = screen.getByTestId("file-menu-open-input") as HTMLInputElement;
    const file = new File([JSON.stringify(projectFile)], "test.voide.json", {
      type: "application/json"
    });

    fireEvent.change(input, {
      target: { files: [file] }
    });

    await waitFor(() => {
      expect(useFlowStore.getState().flow.id).toBe("flow:test-open");
    });
  });

  it("closes the project and restores the default layout", () => {
    renderControls();

    useFlowStore.setState((state) => ({
      flow: { ...state.flow, id: "flow:custom", nodes: [], edges: [] }
    }));

    const trigger = screen.getByRole("button", { name: "File" });
    fireEvent.click(trigger);

    const closeButton = screen.getByRole("menuitem", { name: /^Close$/ });
    fireEvent.click(closeButton);

    const state = useFlowStore.getState();
    const baseline = createInitialFlow();
    expect(state.flow.id).toBe(baseline.id);
    expect(state.flow.nodes).toHaveLength(baseline.nodes.length);
    expect(state.flow.edges).toHaveLength(baseline.edges.length);
  });

  it("saves the current project via a JSON download", () => {
    renderControls();

    const trigger = screen.getByRole("button", { name: "File" });
    fireEvent.click(trigger);

    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;

    const createObjectURLMock = vi.fn(() => "blob:test");
    const revokeObjectURLMock = vi.fn();

    (URL as unknown as { createObjectURL: typeof createObjectURLMock }).createObjectURL =
      originalCreate ?? createObjectURLMock;
    (URL as unknown as { revokeObjectURL: typeof revokeObjectURLMock }).revokeObjectURL =
      originalRevoke ?? revokeObjectURLMock;

    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockImplementation(createObjectURLMock);
    const revokeSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {
        revokeObjectURLMock();
      });
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    try {
      const saveButton = screen.getByRole("menuitem", { name: /Save/ });
      fireEvent.click(saveButton);

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(anchorClickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
    } finally {
      anchorClickSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeSpy.mockRestore();
      if (originalCreate) {
        (URL as unknown as { createObjectURL: typeof originalCreate }).createObjectURL =
          originalCreate;
      } else {
        delete (URL as { createObjectURL?: typeof createObjectURLMock }).createObjectURL;
      }
      if (originalRevoke) {
        (URL as unknown as { revokeObjectURL: typeof originalRevoke }).revokeObjectURL =
          originalRevoke;
      } else {
        delete (URL as { revokeObjectURL?: typeof revokeObjectURLMock }).revokeObjectURL;
      }
    }
  });

  it("triggers export placeholder", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    renderControls();

    const trigger = screen.getByRole("button", { name: "File" });
    fireEvent.click(trigger);

    const exportButton = screen.getByRole("menuitem", { name: /^Export$/ });
    fireEvent.click(exportButton);

    expect(infoSpy).toHaveBeenCalledWith("Export project placeholder triggered.");
  });

  it("invokes the exit API when Exit is selected", async () => {
    renderControls();

    const trigger = screen.getByRole("button", { name: "File" });
    fireEvent.click(trigger);

    const exitButton = screen.getByRole("menuitem", { name: /^Exit/ });
    fireEvent.click(exitButton);

    await waitFor(() => {
      expect(exitAppMock).toHaveBeenCalledTimes(1);
    });
  });

  it("closes the file menu when focus leaves the menu", async () => {
    renderControls();

    const trigger = screen.getByRole("button", { name: "File" });
    fireEvent.click(trigger);

    const navigation = screen.getByRole("navigation");
    const buildButton = screen.getByRole("button", { name: "Build project" });
    buildButton.focus();
    fireEvent.blur(navigation, { relatedTarget: buildButton });

    await waitFor(() => {
      expect(screen.queryByTestId("file-menu-panel")).not.toBeInTheDocument();
    });
  });

  it("opens the working directory submenu and requests a folder", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    renderControls();

    const trigger = screen.getByRole("button", { name: "File" });
    fireEvent.click(trigger);

    const workingButton = screen.getByRole("menuitem", {
      name: /Working Directory/
    });
    fireEvent.click(workingButton);

    const directoryInput = screen.getByTestId(
      "file-menu-directory-input"
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(directoryInput, "click");

    const option = screen.getByRole("menuitem", { name: /LLM Storage Folder/ });
    fireEvent.click(option);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const directoryFile = new File(["model"], "model.bin");
    Object.defineProperty(directoryFile, "webkitRelativePath", {
      value: "llm-storage/model.bin"
    });

    fireEvent.change(directoryInput, {
      target: { files: createFileList(directoryFile) }
    });

    await waitFor(() => {
      expect(infoSpy).toHaveBeenCalledWith("Selected LLM Storage Folder: llm-storage");
    });
  });

  it("persists the selected LLM storage directory", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderControls();

    const trigger = screen.getByRole("button", { name: "File" });
    fireEvent.click(trigger);

    const workingButton = screen.getByRole("menuitem", {
      name: /Working Directory/
    });
    fireEvent.click(workingButton);

    const directoryInput = screen.getByTestId(
      "file-menu-directory-input"
    ) as HTMLInputElement;

    const option = screen.getByRole("menuitem", { name: /LLM Storage Folder/ });
    fireEvent.click(option);

    const directoryFile = new File(["model"], "model.bin");
    Object.defineProperty(directoryFile, "webkitRelativePath", {
      value: "llm-storage/model.bin"
    });
    Object.defineProperty(directoryFile, "path", {
      value: "/Users/voide/llm-storage/model.bin"
    });

    fireEvent.change(directoryInput, {
      target: { files: createFileList(directoryFile) }
    });

    await waitFor(() => {
      expect(secretSetMock).toHaveBeenCalledWith(
        "paths",
        "modelsDir",
        "/Users/voide/llm-storage"
      );
    });

    expect(infoSpy).toHaveBeenCalledWith("Saved models directory: /Users/voide/llm-storage");
    expect(errorSpy).not.toHaveBeenCalled();
    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("allows compute selection of accelerator and cores", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    renderControls();

    const trigger = screen.getByRole("button", { name: "File" });
    fireEvent.click(trigger);

    const computeButton = screen.getByRole("menuitem", { name: /Compute/ });
    fireEvent.click(computeButton);

    const gpuButton = screen.getByRole("menuitem", { name: /^GPU$/ });
    fireEvent.click(gpuButton);

    const eightCoreButton = screen.getByRole("menuitem", { name: /^8$/ });
    fireEvent.click(eightCoreButton);

    expect(infoSpy).toHaveBeenCalledWith("Compute accelerator set to GPU.");
    expect(infoSpy).toHaveBeenCalledWith("CPU cores set to 8.");
    expect(gpuButton).toHaveAttribute("aria-pressed", "true");
    expect(eightCoreButton).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText(/Current: GPU with 8 cores/, { selector: "div" })
    ).toBeTruthy();
  });
});

describe("RunControls actions", () => {
  it("invokes buildFlow when Build button is pressed", async () => {
    renderControls();

    const buildButton = screen.getByRole("button", { name: "Build project" });
    fireEvent.click(buildButton);

    await waitFor(() => {
      expect(buildFlowMock).toHaveBeenCalledTimes(1);
    });
  });

  it("disables Play until a flow has been compiled", () => {
    const view = renderControls();
    const playButton = screen.getByRole("button", { name: "Play" });
    expect(playButton).toBeDisabled();

    useFlowStore.setState({
      compiledFlow: {
        hash: "hash:test",
        version: "1.0.0",
        cached: false,
        flow: createInitialFlow(),
      },
      buildStatus: "success",
      runStatus: "idle",
    });
    view.rerender(<RunControls />);

    expect(screen.getByRole("button", { name: "Play" })).not.toBeDisabled();
  });

  it("runs the compiled flow when Play is clicked", async () => {
    const view = renderControls();
    useFlowStore.setState({
      compiledFlow: {
        hash: "hash:test",
        version: "1.0.0",
        cached: false,
        flow: createInitialFlow(),
      },
      buildStatus: "success",
      runStatus: "idle",
    });
    view.rerender(<RunControls />);

    const playButton = screen.getByRole("button", { name: "Play" });
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(runBuiltFlowMock).toHaveBeenCalledTimes(1);
    });
  });

  it("stops an active run", async () => {
    const view = renderControls();
    useFlowStore.setState({ activeRunId: "run-1", runStatus: "running" });
    view.rerender(<RunControls />);

    const stopButton = screen.getByRole("button", { name: "Stop" });
    expect(stopButton).not.toBeDisabled();
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(stopActiveRunMock).toHaveBeenCalledTimes(1);
    });
  });

  it("shows build and run status text", () => {
    const view = renderControls();
    useFlowStore.setState({
      buildStatus: "error",
      buildError: "Validation failed",
      runStatus: "success",
      runError: null,
    });
    view.rerender(<RunControls />);

    const status = screen.getByTestId("run-controls-status");
    expect(status).toHaveTextContent(/Build: Needs attention/);
    expect(status).toHaveTextContent(/Run: Completed/);
    expect(status).toHaveTextContent(/Validation failed/);
  });
});

describe("RunControls help menu", () => {
  it("opens the help modal with the selected section", () => {
    renderControls();

    const helpButton = screen.getByRole("button", { name: /Help/ });
    fireEvent.click(helpButton);

    const instructionsItem = screen.getByRole("menuitem", {
      name: /Instructions/,
    });
    fireEvent.click(instructionsItem);

    const modal = screen.getByTestId("help-modal");
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent(/Build the current graph/);

    const closeButton = screen.getByRole("button", { name: /Close help dialog/ });
    fireEvent.click(closeButton);
    expect(screen.queryByTestId("help-modal")).not.toBeInTheDocument();
  });
});
