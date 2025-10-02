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

const renderControls = () => render(<RunControls onRun={() => undefined} />);

const createFileList = (file: File): FileList =>
  ({
    0: file,
    length: 1,
    item: (index: number) => (index === 0 ? file : null)
  } as unknown as FileList);

beforeEach(() => {
  const initialFlow = createInitialFlow();
  useFlowStore.setState({
    flow: initialFlow,
    catalog: [],
    activeTool: "select",
    clipboard: null
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
    expect(screen.getByRole("menuitem", { name: /Project/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Working Directory/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Compute/ })).toBeTruthy();
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

  it("triggers export and project placeholders", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    renderControls();

    const trigger = screen.getByRole("button", { name: "File" });
    fireEvent.click(trigger);

    const exportButton = screen.getByRole("menuitem", { name: /^Export$/ });
    fireEvent.click(exportButton);

    fireEvent.click(trigger);
    const projectButton = screen.getByRole("menuitem", { name: /^Project$/ });
    fireEvent.click(projectButton);

    expect(infoSpy).toHaveBeenCalledWith("Export project placeholder triggered.");
    expect(infoSpy).toHaveBeenCalledWith("Project settings placeholder opened.");
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
