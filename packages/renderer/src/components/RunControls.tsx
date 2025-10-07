import type { FlowDef } from "@voide/shared";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createInitialFlow } from "../constants/mockLayout";
import { useFlowStore } from "../state/flowStore";

type FlowState = ReturnType<typeof useFlowStore.getState>;
type BuildStatus = FlowState["buildStatus"];
type RunStatus = FlowState["runStatus"];
type HelpSectionKey = "instructions" | "hints" | "examples";

const textButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "inherit",
  fontWeight: 600,
  fontSize: 14,
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer"
};

const iconButtonStyle: React.CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 12,
  width: 44,
  height: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#f8fafc",
  cursor: "pointer",
  transition: "transform 0.15s ease"
};

const buildButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#f97316",
  border: "none",
  color: "#111827",
  fontWeight: 700,
  fontSize: 14,
  padding: "10px 18px",
  borderRadius: 999,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(249, 115, 22, 0.35)"
};

const glyphStyle: React.CSSProperties = {
  fontSize: 18,
  lineHeight: "18px"
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  marginTop: 8,
  background: "rgba(15, 23, 42, 0.96)",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: 8,
  minWidth: 240,
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.45)",
  backdropFilter: "blur(10px)",
  zIndex: 20
};

const menuItemStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  color: "#e2e8f0",
  textAlign: "left",
  padding: "8px 12px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  cursor: "pointer",
  transition: "background 0.15s ease, color 0.15s ease"
};

const submenuStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: "calc(100% + 8px)",
  background: "rgba(10, 18, 35, 0.96)",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: 12,
  minWidth: 220,
  boxShadow: "0 18px 32px rgba(15, 23, 42, 0.35)",
  display: "flex",
  flexDirection: "column",
  gap: 12
};

const submenuSectionLabel: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "#94a3b8"
};

const submenuOptionStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 8,
  padding: "8px 10px",
  color: "#e2e8f0",
  fontSize: 13,
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  transition: "border 0.15s ease, background 0.15s ease"
};

const summaryTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#cbd5f5"
};

const computeSummaryText: React.CSSProperties = {
  fontSize: 12,
  color: "#38bdf8",
  fontWeight: 500
};

const disabledIconButtonStyle: React.CSSProperties = {
  opacity: 0.45,
  cursor: "not-allowed"
};

const disabledBuildButtonStyle: React.CSSProperties = {
  opacity: 0.7,
  cursor: "not-allowed"
};

const statusWrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 220,
  color: "#cbd5f5"
};

const statusLineStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 8
};

const statusLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.6
};

const statusValueStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#f8fafc"
};

const statusGlyphStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700
};

const errorTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#f87171",
  maxWidth: 320,
  lineHeight: 1.4
};

const helpMenuIconStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  borderRadius: "50%",
  background: "rgba(148, 163, 184, 0.22)",
  fontWeight: 700,
  marginRight: 6
};

const helpModalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 60
};

const helpModalBackdropStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(15, 23, 42, 0.65)"
};

const helpModalContentStyle: React.CSSProperties = {
  position: "relative",
  background: "rgba(15, 23, 42, 0.98)",
  border: "1px solid #1e293b",
  borderRadius: 16,
  padding: "24px 28px",
  width: "min(480px, 90vw)",
  maxHeight: "80vh",
  overflowY: "auto",
  color: "#e2e8f0",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  boxShadow: "0 32px 60px rgba(15, 23, 42, 0.55)"
};

const helpModalTitleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16
};

const helpModalTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 700
};

const helpModalCloseButtonStyle: React.CSSProperties = {
  background: "transparent",
  color: "#e2e8f0",
  border: "1px solid #334155",
  borderRadius: 999,
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer"
};

const helpModalSummaryStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
  color: "#cbd5f5"
};

const helpModalListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  display: "flex",
  flexDirection: "column",
  gap: 8
};

const helpModalListItemStyle: React.CSSProperties = {
  lineHeight: 1.5
};

const HELP_MENU_ITEMS: Array<{ key: HelpSectionKey; label: string; summary: string }> = [
  { key: "instructions", label: "Instructions", summary: "Build & run walkthrough" },
  { key: "hints", label: "Helpful Hints", summary: "Telemetry & layout tips" },
  { key: "examples", label: "Examples", summary: "Starter prompts & flows" }
];

const HELP_SECTIONS: Record<HelpSectionKey, { title: string; summary: string; points: string[] }> = {
  instructions: {
    title: "Instructions",
    summary: "Build the current graph, then run the cached plan to stream results back into interface modules.",
    points: [
      "Connect modules on the canvas until every required port has telemetry lights in the idle state.",
      "Select Build to validate the layout and persist the compiled flow to the orchestrator.",
      "Press Play to reuse the most recent successful build; Stop halts the active run if you need to iterate."
    ]
  },
  hints: {
    title: "Helpful Hints",
    summary: "Keep the canvas responsive while iterating on prompts and module settings.",
    points: [
      "Drag option panels anywhere—moving a node will not disturb their geometry.",
      "Watch edge and port indicators to confirm when data transfers succeed or error out.",
      "Zoom far out (scroll or pinch) to inspect large flows; auto-pan stays disabled while dragging nodes."
    ]
  },
  examples: {
    title: "Examples",
    summary: "Reference starter prompts and flow behavior for quick experimentation.",
    points: [
      "Prompt presets include 'You are a helpful AI assistant.' plus a heuristic audit example right in the menu.",
      "The sample flow routes UI input through Prompt → LLM → Cache before returning feedback to the chat window.",
      "Use Help → Instructions anytime to revisit the full build/run lifecycle."
    ]
  }
};

const BUILD_STATUS_LABELS: Record<BuildStatus, string> = {
  idle: "Not built",
  building: "Building…",
  success: "Ready",
  error: "Needs attention"
};

const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  idle: "Idle",
  running: "Running…",
  success: "Completed",
  error: "Failed"
};

const BUILD_STATUS_GLYPH: Record<BuildStatus, string> = {
  idle: "○",
  building: "…",
  success: "✓",
  error: "!"
};

const RUN_STATUS_GLYPH: Record<RunStatus, string> = {
  idle: "○",
  running: "…",
  success: "✓",
  error: "!"
};

const describeBuildStatus = (status: BuildStatus): string =>
  BUILD_STATUS_LABELS[status] ?? "Unknown";

const describeRunStatus = (status: RunStatus): string =>
  RUN_STATUS_LABELS[status] ?? "Unknown";

const glyphForBuild = (status: BuildStatus): string =>
  BUILD_STATUS_GLYPH[status] ?? "○";

const glyphForRun = (status: RunStatus): string => RUN_STATUS_GLYPH[status] ?? "○";

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read file"));
    };
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
        return;
      }
      if (result instanceof ArrayBuffer) {
        resolve(new TextDecoder().decode(result));
        return;
      }
      resolve(String(result ?? ""));
    };
    reader.readAsText(file);
  });

export default function RunControls() {
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<
    "working-directory" | "compute" | null
  >(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoveredHelpItem, setHoveredHelpItem] = useState<string | null>(null);
  const [hoveredWorkingOption, setHoveredWorkingOption] = useState<string | null>(
    null
  );
  const [hoveredComputeOption, setHoveredComputeOption] = useState<
    string | null
  >(null);
  const [computeConfig, setComputeConfig] = useState<{
    accelerator: "CPU" | "GPU";
    cpuCores: number;
  }>({ accelerator: "CPU", cpuCores: 4 });
  const [activeHelpSection, setActiveHelpSection] = useState<
    HelpSectionKey | null
  >(null);

  const menuRef = useRef<HTMLElement | null>(null);
  const openFileInputRef = useRef<HTMLInputElement | null>(null);
  const directoryInputRef = useRef<HTMLInputElement | null>(null);
  const pendingDirectorySelection = useRef<string | null>(null);

  const flow = useFlowStore((state) => state.flow);
  const setFlow = useFlowStore((state) => state.setFlow);
  const buildFlow = useFlowStore((state) => state.buildFlow);
  const buildStatus = useFlowStore((state) => state.buildStatus);
  const buildError = useFlowStore((state) => state.buildError);
  const runBuiltFlow = useFlowStore((state) => state.runBuiltFlow);
  const runStatus = useFlowStore((state) => state.runStatus);
  const runError = useFlowStore((state) => state.runError);
  const stopActiveRun = useFlowStore((state) => state.stopActiveRun);
  const activeRunId = useFlowStore((state) => state.activeRunId);
  const compiledFlow = useFlowStore((state) => state.compiledFlow);

  const hasCompiledFlow = Boolean(compiledFlow);
  const isBuilding = buildStatus === "building";
  const isRunning = runStatus === "running";
  const canRun = hasCompiledFlow && !isRunning && !isBuilding;
  const stopDisabled = !activeRunId;
  const buildStatusLabel = describeBuildStatus(buildStatus);
  const runStatusLabel = describeRunStatus(runStatus);
  const buildGlyph = glyphForBuild(buildStatus);
  const runGlyph = glyphForRun(runStatus);

  const workingDirectoryOptions = useMemo(
    () => [
      { key: "llm", label: "LLM Storage Folder" },
      { key: "workspace", label: "Project Workspace" },
      { key: "cache", label: "Cache Directory" }
    ],
    []
  );

  const cpuCoreOptions = useMemo(() => [1, 2, 4, 8, 16], []);

  const closeMenus = useCallback(() => {
    setFileMenuOpen(false);
    setHelpMenuOpen(false);
    setActiveSubmenu(null);
    setHoveredItem(null);
    setHoveredHelpItem(null);
    setHoveredWorkingOption(null);
    setHoveredComputeOption(null);
  }, []);

  const handleToggleFileMenu = useCallback(() => {
    setFileMenuOpen((previous) => {
      const next = !previous;
      if (next) {
        setHelpMenuOpen(false);
        setActiveSubmenu(null);
        setHoveredHelpItem(null);
      } else {
        setActiveSubmenu(null);
        setHoveredItem(null);
      }
      return next;
    });
  }, []);

  const handleToggleHelpMenu = useCallback(() => {
    setHelpMenuOpen((previous) => {
      const next = !previous;
      if (next) {
        setFileMenuOpen(false);
        setActiveSubmenu(null);
        setHoveredItem(null);
      } else {
        setHoveredHelpItem(null);
      }
      return next;
    });
  }, []);

  const handleHelpSectionSelect = useCallback(
    (section: HelpSectionKey) => {
      setActiveHelpSection(section);
      closeMenus();
    },
    [closeMenus]
  );

  const handleCloseHelpModal = useCallback(() => {
    setActiveHelpSection(null);
  }, []);

  useEffect(() => {
    if (!fileMenuOpen && !helpMenuOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        closeMenus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenus();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenus, fileMenuOpen, helpMenuOpen]);

  useEffect(() => {
    if (directoryInputRef.current) {
      directoryInputRef.current.setAttribute("webkitdirectory", "");
    }
  }, []);

  const processProjectFile = useCallback(
    async (file: File) => {
      try {
        const text =
          typeof file.text === "function"
            ? await file.text()
            : typeof FileReader === "function"
              ? await readFileAsText(file)
              : await new Response(file).text();
        const parsed = JSON.parse(text) as FlowDef;

        if (
          !parsed ||
          typeof parsed !== "object" ||
          !Array.isArray((parsed as FlowDef).nodes) ||
          !Array.isArray((parsed as FlowDef).edges)
        ) {
          throw new Error("Invalid VOIDE project file.");
        }

        setFlow(parsed);
        console.info(
          `Opened project "${file.name}" with ${parsed.nodes.length} nodes and ${parsed.edges.length} edges.`
        );
      } catch (error) {
        console.error("Failed to open project file:", error);
      } finally {
        closeMenus();
      }
    },
    [closeMenus, setFlow]
  );

  const handleProjectFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = event.target;
      if (files && files.length > 0) {
        void processProjectFile(files[0]);
      }
      event.target.value = "";
    },
    [processProjectFile]
  );

  const handleOpenProject = useCallback(() => {
    openFileInputRef.current?.click();
  }, []);

  const handleCloseProject = useCallback(() => {
    setFlow(createInitialFlow());
    console.info("Closed project and restored default layout.");
    closeMenus();
  }, [closeMenus, setFlow]);

  const handleSaveProject = useCallback(() => {
    try {
      const serialized = JSON.stringify(flow, null, 2);
      const blob = new Blob([serialized], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `voide-project-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      console.info("Saved current project to disk.");
    } catch (error) {
      console.error("Failed to save project:", error);
    } finally {
      closeMenus();
    }
  }, [closeMenus, flow]);

  const handleExportProject = useCallback(() => {
    console.info("Export project placeholder triggered.");
    closeMenus();
  }, [closeMenus]);

  const handleDirectoryRequest = useCallback((label: string) => {
    pendingDirectorySelection.current = label;
    directoryInputRef.current?.click();
  }, []);

  const handleExitApp = useCallback(async () => {
    try {
      await window.voide?.exitApp?.();
    } catch (error) {
      console.error("Failed to exit VOIDE:", error);
    } finally {
      closeMenus();
    }
  }, [closeMenus]);

  const handleMenuBlur = useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      if (!fileMenuOpen && !helpMenuOpen) {
        return;
      }
      const nextTarget = event.relatedTarget as Node | null;
      const menuElement = menuRef.current;
      if (menuElement && nextTarget && menuElement.contains(nextTarget)) {
        return;
      }
      closeMenus();
    },
    [closeMenus, fileMenuOpen, helpMenuOpen]
  );

  const handleDirectoryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = event.target;
      const label = pendingDirectorySelection.current;

      if (label && files && files.length > 0) {
        const selectedFile = files[0];
        const relativePath =
          (selectedFile as File & { webkitRelativePath?: string })
            .webkitRelativePath ?? selectedFile.name;
        const directoryName = relativePath.split("/")[0] ?? relativePath;
        console.info(`Selected ${label}: ${directoryName}`);
      } else if (label) {
        console.info(`No directory selected for ${label}.`);
      }

      pendingDirectorySelection.current = null;
      event.target.value = "";
      closeMenus();
    },
    [closeMenus]
  );

  const handleSelectAccelerator = useCallback((accelerator: "CPU" | "GPU") => {
    setComputeConfig((previous) => {
      if (previous.accelerator === accelerator) {
        return previous;
      }
      console.info(`Compute accelerator set to ${accelerator}.`);
      return { ...previous, accelerator };
    });
  }, []);

  const handleSelectCpuCores = useCallback((cores: number) => {
    setComputeConfig((previous) => {
      if (previous.cpuCores === cores) {
        return previous;
      }
      console.info(`CPU cores set to ${cores}.`);
      return { ...previous, cpuCores: cores };
    });
  }, []);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 64,
        background: "linear-gradient(90deg, #0f172a, #1f2937)",
        color: "#e2e8f0",
        borderBottom: "1px solid #1e293b"
      }}
    >
      <nav
        ref={menuRef}
        onBlur={handleMenuBlur}
        style={{
          display: "flex",
          gap: 8,
          position: "relative",
          alignItems: "center"
        }}
      >
        <div style={{ position: "relative" }}>
          <button
            type="button"
            style={{
              ...textButtonStyle,
              background: fileMenuOpen ? "rgba(30, 41, 59, 0.75)" : "none"
            }}
            onClick={handleToggleFileMenu}
            aria-expanded={fileMenuOpen}
            aria-haspopup="menu"
          >
            File
          </button>
          {fileMenuOpen ? (
            <div role="menu" style={dropdownStyle} data-testid="file-menu-panel">
              <button
                type="button"
                role="menuitem"
                style={{
                  ...menuItemStyle,
                  background: hoveredItem === "open" ? "#1e293b" : "transparent"
                }}
                onMouseEnter={() => setHoveredItem("open")}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={handleOpenProject}
              >
                <span>Open</span>
                <span aria-hidden>⌘O</span>
              </button>
              <button
                type="button"
                role="menuitem"
                style={{
                  ...menuItemStyle,
                  background: hoveredItem === "close" ? "#1e293b" : "transparent"
                }}
                onMouseEnter={() => setHoveredItem("close")}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={handleCloseProject}
              >
                <span>Close</span>
              </button>
              <button
                type="button"
                role="menuitem"
                style={{
                  ...menuItemStyle,
                  background: hoveredItem === "save" ? "#1e293b" : "transparent"
                }}
                onMouseEnter={() => setHoveredItem("save")}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={handleSaveProject}
              >
                <span>Save</span>
                <span aria-hidden>⌘S</span>
              </button>
              <button
                type="button"
                role="menuitem"
                style={{
                  ...menuItemStyle,
                  background: hoveredItem === "export" ? "#1e293b" : "transparent"
                }}
                onMouseEnter={() => setHoveredItem("export")}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={handleExportProject}
              >
                <span>Export</span>
              </button>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  role="menuitem"
                  style={{
                    ...menuItemStyle,
                    background:
                      hoveredItem === "working-directory"
                        ? "#1e293b"
                        : "transparent"
                  }}
                  onMouseEnter={() => setHoveredItem("working-directory")}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() =>
                    setActiveSubmenu((previous) =>
                      previous === "working-directory"
                        ? null
                        : "working-directory"
                    )
                  }
                  aria-haspopup="menu"
                  aria-expanded={activeSubmenu === "working-directory"}
                >
                  <span>Working Directory</span>
                  <span aria-hidden>{
                    activeSubmenu === "working-directory" ? "▾" : "▸"
                  }</span>
                </button>
                {activeSubmenu === "working-directory" ? (
                  <div role="menu" style={submenuStyle}>
                    <div style={summaryTextStyle}>
                      Select where VOIDE stores shared resources.
                    </div>
                    {workingDirectoryOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        role="menuitem"
                        style={{
                          ...submenuOptionStyle,
                          borderColor:
                            hoveredWorkingOption === option.key
                              ? "#f97316"
                              : "#1e293b",
                          backgroundColor:
                            hoveredWorkingOption === option.key
                              ? "#1f2937"
                              : "#0f172a"
                        }}
                        onMouseEnter={() => setHoveredWorkingOption(option.key)}
                        onMouseLeave={() => setHoveredWorkingOption(null)}
                        onClick={() => handleDirectoryRequest(option.label)}
                      >
                        <span>{option.label}</span>
                        <span aria-hidden>…</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  role="menuitem"
                  style={{
                    ...menuItemStyle,
                    background:
                      hoveredItem === "compute" ? "#1e293b" : "transparent"
                  }}
                  onMouseEnter={() => setHoveredItem("compute")}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() =>
                    setActiveSubmenu((previous) =>
                      previous === "compute" ? null : "compute"
                    )
                  }
                  aria-haspopup="menu"
                  aria-expanded={activeSubmenu === "compute"}
                >
                  <span>Compute</span>
                  <span aria-hidden>
                    {computeConfig.accelerator} · {computeConfig.cpuCores} cores
                  </span>
                </button>
                {activeSubmenu === "compute" ? (
                  <div role="menu" style={submenuStyle}>
                    <div>
                      <div style={submenuSectionLabel}>Accelerator</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        {["CPU", "GPU"].map((option) => (
                          <button
                            key={option}
                            type="button"
                            role="menuitem"
                            style={{
                              ...submenuOptionStyle,
                              padding: "8px 14px",
                              background:
                                computeConfig.accelerator === option
                                  ? "#1f2937"
                                  : "#0f172a",
                              borderColor:
                                computeConfig.accelerator === option
                                  ? "#f97316"
                                  : "#1e293b"
                            }}
                            aria-pressed={computeConfig.accelerator === option}
                            onMouseEnter={() => setHoveredComputeOption(option)}
                            onMouseLeave={() => setHoveredComputeOption(null)}
                            onClick={() =>
                              handleSelectAccelerator(option as "CPU" | "GPU")
                            }
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={submenuSectionLabel}>CPU Cores</div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                          gap: 8,
                          marginTop: 8
                        }}
                      >
                        {cpuCoreOptions.map((cores) => (
                          <button
                            key={cores}
                            type="button"
                            role="menuitem"
                            style={{
                              ...submenuOptionStyle,
                              background:
                                computeConfig.cpuCores === cores
                                  ? "#1f2937"
                                  : "#0f172a",
                              borderColor:
                                computeConfig.cpuCores === cores
                                  ? "#f97316"
                                  : hoveredComputeOption === `cores-${cores}`
                                    ? "#f97316"
                                    : "#1e293b"
                            }}
                            aria-pressed={computeConfig.cpuCores === cores}
                            onMouseEnter={() =>
                              setHoveredComputeOption(`cores-${cores}`)
                            }
                            onMouseLeave={() => setHoveredComputeOption(null)}
                            onClick={() => handleSelectCpuCores(cores)}
                          >
                            {cores}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ ...summaryTextStyle, ...computeSummaryText }}>
                      Current: {computeConfig.accelerator} with {computeConfig.cpuCores}{" "}
                      cores
                    </div>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                role="menuitem"
                style={{
                  ...menuItemStyle,
                  background: hoveredItem === "exit" ? "#1e293b" : "transparent"
                }}
                onMouseEnter={() => setHoveredItem("exit")}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={handleExitApp}
              >
                <span>Exit</span>
                <span aria-hidden>⌘Q</span>
              </button>
            </div>
          ) : null}
        </div>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            style={{
              ...textButtonStyle,
              background: helpMenuOpen ? "rgba(30, 41, 59, 0.75)" : "none"
            }}
            onClick={handleToggleHelpMenu}
            aria-expanded={helpMenuOpen}
            aria-haspopup="menu"
          >
            <span aria-hidden style={helpMenuIconStyle}>?</span>
            Help
          </button>
          {helpMenuOpen ? (
            <div role="menu" style={dropdownStyle} data-testid="help-menu-panel">
              {HELP_MENU_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  style={{
                    ...menuItemStyle,
                    background:
                      hoveredHelpItem === item.key ? "#1e293b" : "transparent"
                  }}
                  onMouseEnter={() => setHoveredHelpItem(item.key)}
                  onMouseLeave={() => setHoveredHelpItem(null)}
                  onClick={() => handleHelpSectionSelect(item.key)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span aria-hidden style={helpMenuIconStyle}>?</span>
                    {item.label}
                  </span>
                  <span style={summaryTextStyle}>{item.summary}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <input
          ref={openFileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={handleProjectFileChange}
          data-testid="file-menu-open-input"
        />
        <input
          ref={directoryInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleDirectoryChange}
          data-testid="file-menu-directory-input"
        />
      </nav>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <button
          type="button"
          style={{
            ...iconButtonStyle,
            ...(canRun ? {} : disabledIconButtonStyle)
          }}
          onClick={() => {
            if (canRun) {
              void runBuiltFlow();
            }
          }}
          aria-label="Play"
          disabled={!canRun}
        >
          <span aria-hidden style={glyphStyle}>▶</span>
        </button>
        <button
          type="button"
          style={{
            ...iconButtonStyle,
            ...disabledIconButtonStyle
          }}
          aria-label="Pause"
          disabled
        >
          <span aria-hidden style={glyphStyle}>⏸</span>
        </button>
        <button
          type="button"
          style={{
            ...iconButtonStyle,
            ...(stopDisabled ? disabledIconButtonStyle : {})
          }}
          onClick={() => {
            if (!stopDisabled) {
              void stopActiveRun();
            }
          }}
          aria-label="Stop"
          disabled={stopDisabled}
        >
          <span aria-hidden style={glyphStyle}>■</span>
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          type="button"
          style={{
            ...buildButtonStyle,
            ...(isBuilding ? disabledBuildButtonStyle : {})
          }}
          onClick={() => {
            if (!isBuilding) {
              void buildFlow();
            }
          }}
          aria-label="Build project"
          disabled={isBuilding}
        >
          <span aria-hidden style={{ fontSize: 18, lineHeight: "18px" }}>
            {isBuilding ? "⏳" : "🔨"}
          </span>
          <span>{isBuilding ? "Building…" : "Build"}</span>
        </button>
        <div
          style={statusWrapperStyle}
          role="status"
          aria-live="polite"
          data-testid="run-controls-status"
        >
          <div style={statusLineStyle}>
            <span aria-hidden style={statusGlyphStyle}>{buildGlyph}</span>
            <span>
              <span style={statusLabelStyle}>Build</span>
              {": "}
              <span style={statusValueStyle}>{buildStatusLabel}</span>
            </span>
          </div>
          <div style={statusLineStyle}>
            <span aria-hidden style={statusGlyphStyle}>{runGlyph}</span>
            <span>
              <span style={statusLabelStyle}>Run</span>
              {": "}
              <span style={statusValueStyle}>{runStatusLabel}</span>
            </span>
          </div>
          {buildError ? <div style={errorTextStyle}>{buildError}</div> : null}
          {runError ? <div style={errorTextStyle}>{runError}</div> : null}
        </div>
      </div>

      {activeHelpSection ? (
        <HelpModal section={activeHelpSection} onClose={handleCloseHelpModal} />
      ) : null}
    </header>
  );
}

interface HelpModalProps {
  section: HelpSectionKey;
  onClose: () => void;
}

function HelpModal({ section, onClose }: HelpModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const content = HELP_SECTIONS[section];
  if (!content) {
    return null;
  }

  const headingId = `run-controls-help-${section}`;
  const summaryId = `${headingId}-summary`;

  return (
    <div
      style={helpModalOverlayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      aria-describedby={summaryId}
      data-testid="help-modal"
    >
      <div style={helpModalBackdropStyle} onClick={onClose} />
      <div style={helpModalContentStyle}>
        <div style={helpModalTitleRowStyle}>
          <h2 id={headingId} style={helpModalTitleStyle}>
            <span aria-hidden style={{ ...helpMenuIconStyle, marginRight: 12 }}>?</span>
            {content.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={helpModalCloseButtonStyle}
            aria-label="Close help dialog"
          >
            ×
          </button>
        </div>
        <p id={summaryId} style={helpModalSummaryStyle}>
          {content.summary}
        </p>
        <ul style={helpModalListStyle}>
          {content.points.map((point, index) => (
            <li key={`${section}-${index}`} style={helpModalListItemStyle}>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
