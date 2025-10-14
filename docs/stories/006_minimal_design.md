# 006_minimal_design – Minimal Studio Design System

## Executive Summary

**Goal**: Transform atelier from a colorful dashboard into a minimal, professional art studio environment where the UI recedes and user's work shines.

**Strategy**: Monochrome foundation (black/white/grey) + 2 accent colors (blue for prompt nodes, purple for image nodes) + clear 5-tier visual hierarchy.

**Scope**: Visual refresh only—no logic changes, no new features. Existing component structure fully supports all proposed changes.

**Effort**: 8-12 hours across 6 incremental steps, each independently testable and revertable.

**Impact**:

- ✅ Images show full artwork (no cropped corners)
- ✅ Content more prominent than chrome (settings icons nearly invisible)
- ✅ Run button immediately obvious (white, semibold)
- ✅ Professional "studio" aesthetic (calm, minimal, focused)

**Compatibility**: ✅ All changes are CSS/class-based. Component structure, props, and logic remain unchanged.

---

## Problem Statement

The current design has visual noise that competes with the user's creative work:

- **Too many colors**: Mixed accent colors, varied hover states, inconsistent highlighting across components
- **Broken hierarchy**: Settings icons are as prominent as the actual content (prompts, images)
- **Contrast issues**: Hover effects lack proper contrast ratios; visual states are unclear
- **Overuse of rounded borders**: Every element has border-radius, creating visual clutter and hiding image corners
- **Inconsistent typography**: Mixed font sizes without clear hierarchy; labels compete with content
- **Canvas distractions**: UI chrome draws attention away from the node graph and generated assets

### Current Design Violations

From user perspective:

- ❌ Settings button on nodes is more prominent than the prompt text itself
- ❌ Images have rounded corners that crop the generated artwork
- ❌ Color accents appear on non-essential elements (badges, status indicators, random highlights)
- ❌ Header buttons all look equally important (no visual priority)
- ❌ Node borders, shadows, and backgrounds compete for attention
- ❌ Inspector panel styling is as loud as the canvas

### Design Philosophy Violation

**atelier** should be an art studio environment—a space that recedes into the background and lets the user's creations shine. Currently, the UI competes with the art.

### Current Design System (Baseline)

**Colors** (`app/globals.css:7-43`):

```css
--background: #0a0a0f
--primary: linear-gradient(135deg, #ff0080, #ff8c00, #40e0d0, #9370db, #ff1493)
--primary-solid: #ff0080    /* Pink - used everywhere */
--secondary: #ec4899         /* More pink */
--accent: #40e0d0            /* Turquoise */
--destructive: #ff4757       /* Red */
--border: #3f3f46            /* Grey (good!) */
--muted-foreground: #a1a1aa  /* Grey text (good!) */
```

Rainbow gradient used in: scrollbars, hover states, connection handles, borders

**Typography**: Currently uses `text-xs` (12px) and `text-sm` (14px) - close to my 3-tier proposal

**Border Radius**: `--radius: 0.375rem` (6px) - perfect for my `--radius-md`

**Node Structure** (`components/node-components.tsx:18-65`):

```tsx
<Card className="border hover:border-primary bg-card/90">
  {" "}
  {/* Pink hover! */}
  <NodeResizer />
  <Handle /> {/* Hardcoded colors */}
  {children}
</Card>
```

**Images** (`components/nodes/image-node.tsx:338-343`):

```tsx
<div className="rounded border">
  {" "}
  {/* Crops corners! */}
  <img className="rounded" /> {/* Also rounded! */}
</div>
```

**Settings Icon** (`components/node-components.tsx:82-92`):

```tsx
<Button variant="ghost" className="h-6 w-6">
  <Settings2 className="w-3 h-3" /> {/* Same prominence as title */}
</Button>
```

**Running State** (`components/node-components.tsx:24-26`):

```tsx
isRunning ? "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.35)]" : "..."
```

Very loud yellow glow!

## Goals

### Immediate (Minimal Design System) - **THIS STORY**

- ✅ Switch to monochrome foundation: black, white, dark greys only
- ✅ Reserve color ONLY for node type identity (prompt node accent, image node accent)
- ✅ Establish clear visual hierarchy: content > actions > chrome
- ✅ Remove rounded borders from images (show full generated art)
- ✅ Use rounded borders sparingly for intentional emphasis
- ✅ Reduce prominence of secondary actions (settings, metadata icons)
- ✅ Make primary actions stand out (Run button, execute triggers)
- ✅ Unify typography with 2-3 size tiers maximum
- ✅ Fix hover/focus contrast for accessibility
- ✅ Create a "studio environment" feeling—calm, professional, invisible

### Future Considerations - **NOT THIS STORY, KEEP IN MIND**

- ✅ Dark mode toggle (optional light theme with same minimal principles)
- ✅ User-customizable accent colors for node types
- ✅ High contrast mode for accessibility
- ✅ Compact/spacious density settings

## Proposed Design System

### Color Palette (Monochrome Foundation)

**Base Colors** (all UI chrome):

```css
--background:        #0a0a0a    /* Canvas, app background */
--surface:           #141414    /* Cards, panels, nodes */
--surface-elevated:  #1a1a1a    /* Hover states, overlays */
--border:            #262626    /* Subtle dividers */
--border-strong:     #404040    /* Emphasized borders */

--text-primary:      #ffffff    /* Headings, important text */
--text-secondary:    #a3a3a3    /* Body text, labels */
--text-muted:        #737373    /* Hints, placeholders */

--action-primary:    #ffffff    /* Primary buttons (Run) */
--action-secondary:  #404040    /* Secondary buttons */
--action-ghost:      transparent /* Tertiary buttons (settings) */
```

**Node Type Accents** (ONLY colors in the system):

```css
--node-prompt:       #3b82f6    /* Blue - prompt nodes */
--node-image:        #8b5cf6    /* Purple - image nodes */

/* Accents used ONLY for:
   - Node header background (subtle, low opacity)
   - Node border when selected
   - Connection handle stroke
   - Edge stroke when connected to this node type
*/
```

**Functional Colors** (status only):

```css
--status-error:      #ef4444    /* Errors, warnings */
--status-success:    #10b981    /* Success states (minimal use) */
--status-running:    #f59e0b    /* Active execution (subtle pulse) */
```

### Typography Hierarchy

**Three sizes only**:

```css
--font-size-lg:      14px       /* Node titles, panel headers */
--font-size-base:    13px       /* Body text, inputs, labels */
--font-size-sm:      11px       /* Hints, metadata, counts */

--font-weight-normal:  400
--font-weight-medium:  500
--font-weight-semibold: 600      /* Use sparingly - primary actions only */

--line-height-tight:   1.3      /* Headings */
--line-height-normal:  1.5      /* Body text */
```

**Content vs Chrome**:

- User-created content (prompts, filenames): `--font-weight-medium`
- UI labels: `--font-weight-normal`, `--text-secondary`
- Primary actions: `--font-weight-semibold`, `--text-primary`

### Border Radius Strategy

**Sparingly applied**:

```css
--radius-none:       0px        /* Images, strict geometric elements */
--radius-sm:         4px        /* Buttons, inputs, small UI */
--radius-md:         6px        /* Nodes, panels (ONLY when selected/emphasized) */
--radius-full:       9999px     /* Pills, badges (minimal use) */
```

**Rules**:

- ❌ NO rounded borders on images (user's art should show in full)
- ❌ NO rounded borders on inactive/default nodes (use sharp corners)
- ✅ YES rounded borders on selected nodes (emphasizes focus)
- ✅ YES rounded borders on primary action buttons
- ❌ NO rounded borders on ghost/tertiary buttons
- ✅ YES rounded borders on inputs (standard interaction affordance)

### Visual Hierarchy Tiers

**Tier 1: User Content** (maximum prominence)

- Prompt text in prompt nodes
- Generated images in image nodes
- Result history thumbnails
- Node titles (user-created workflows)

**Tier 2: Primary Actions** (high prominence)

- Run button (execute queue)
- "Use Selected" in media manager
- Connection handles (when draggable)
- Node selection state

**Tier 3: Secondary Actions** (medium prominence)

- Add node button
- Workflow switcher
- Inspector panel toggle
- Canvas controls (zoom, fit)

**Tier 4: Tertiary Actions** (low prominence)

- Settings icons on nodes
- Metadata icons (generation settings viewer)
- Delete buttons (appear on hover only)
- Status badges

**Tier 5: UI Chrome** (minimal prominence)

- Panel backgrounds
- Dividers
- Labels
- Hints/placeholders

### Component Design Patterns

#### Nodes

**Default state** (Tier 5 chrome):

```css
background: var(--surface)
border: 1px solid var(--border)
border-radius: 0px  /* Sharp corners */
box-shadow: none
```

**Selected state** (Tier 2 emphasis):

```css
background: var(--surface)
border: 2px solid var(--node-prompt)  /* Node type color */
border-radius: 6px  /* Now rounded to emphasize selection */
box-shadow: 0 0 0 1px var(--node-prompt) / 0.2  /* Subtle glow */
```

**Node header**:

```css
/* Prompt node */
background: linear-gradient(to bottom,
  rgba(59, 130, 246, 0.08),  /* --node-prompt at 8% */
  transparent
)

/* Image node */
background: linear-gradient(to bottom,
  rgba(139, 92, 246, 0.08),  /* --node-image at 8% */
  transparent
)

/* Title */
font-size: var(--font-size-lg)
font-weight: var(--font-weight-medium)
color: var(--text-primary)
```

**Settings icon** (Tier 4 - LOW prominence):

```css
/* Default: nearly invisible */
color: var(--text-muted)
opacity: 0.4
size: 14px

/* Hover: subtle reveal */
opacity: 1
color: var(--text-secondary)
```

**Content area** (Tier 1 - HIGH prominence):

```css
/* Prompt textarea */
font-size: var(--font-size-base)
font-weight: var(--font-weight-medium)  /* Content is emphasized */
color: var(--text-primary)
background: var(--surface-elevated)
border: 1px solid var(--border)
border-radius: var(--radius-sm)

/* Images */
border-radius: 0px  /* NO rounding - show full art */
border: 1px solid var(--border)
```

**Selected result image** (Tier 2):

```css
border: 2px solid var(--node-image)  /* Node type color */
border-radius: 0px  /* Still no rounding, even when selected */
```

#### Header

**Background**:

```css
background: var(--surface)
border-bottom: 1px solid var(--border)
```

**Run button** (Tier 2 - PRIMARY action):

```css
background: var(--action-primary)  /* White */
color: var(--background)  /* Black text */
font-weight: var(--font-weight-semibold)
border-radius: var(--radius-sm)
border: none

/* Has visual weight - stands out */
padding: 6px 16px
```

**Secondary buttons** (Tier 3):

```css
background: transparent
color: var(--text-secondary)
font-weight: var(--font-weight-normal)
border: 1px solid var(--border)
border-radius: var(--radius-sm)

/* Hover */
background: var(--surface-elevated)
border-color: var(--border-strong)
```

**Tertiary buttons** (Tier 4 - ghost):

```css
background: transparent
color: var(--text-secondary)
border: none
border-radius: 0px  /* No rounding */

/* Hover */
background: var(--surface-elevated)
color: var(--text-primary)
```

**Workflow switcher**:

```css
/* Workflows are user content - Tier 1 */
font-weight: var(--font-weight-medium)
color: var(--text-primary)
```

#### Inspector Panel

**Background** (Tier 5 chrome - recedes):

```css
background: var(--surface)
border-right: 1px solid var(--border)  /* Subtle divider */
```

**Section headers**:

```css
font-size: var(--font-size-sm)
font-weight: var(--font-weight-normal)
color: var(--text-muted)
text-transform: uppercase
letter-spacing: 0.05em
```

**Content** (Tier 1 when showing user data):

```css
/* Prompt text */
color: var(--text-primary)
font-weight: var(--font-weight-medium)

/* Labels */
color: var(--text-secondary)
font-weight: var(--font-weight-normal)
```

#### Canvas

**Background**:

```css
background: var(--background); /* Pure black */
```

**Grid** (if shown):

```css
stroke: var(--border)
opacity: 0.3
```

**Edges** (bezier connections):

```css
/* Default */
stroke: var(--border-strong)
stroke-width: 1.5px

/* Connected to prompt node */
stroke: color-mix(in srgb, var(--node-prompt) 40%, var(--border-strong))

/* Connected to image node */
stroke: color-mix(in srgb, var(--node-image) 40%, var(--border-strong))

/* Selected */
stroke-width: 2px
```

**Connection handles**:

```css
/* Default: subtle */
fill: var(--surface-elevated)
stroke: var(--border-strong)

/* Hover (connectable) - Tier 2 emphasis */
fill: var(--node-prompt)  /* Node type color */
stroke: var(--node-prompt)
scale: 1.2
```

#### Media Manager

**Grid background** (Tier 5):

```css
background: var(--background);
```

**Image thumbnails**:

```css
border: 1px solid var(--border)
border-radius: 0px  /* NO rounding - show art */

/* Hover */
border-color: var(--border-strong)

/* Selected (Tier 2) */
border: 2px solid var(--node-image)
box-shadow: 0 0 0 1px var(--node-image) / 0.2
```

**Action buttons** (selection mode):

```css
/* "Use Selected" - PRIMARY (Tier 2) */
background: var(--action-primary)
color: var(--background)
font-weight: var(--font-weight-semibold)
border-radius: var(--radius-sm)

/* "Cancel" - SECONDARY (Tier 3) */
background: transparent
color: var(--text-secondary)
border: 1px solid var(--border)
border-radius: var(--radius-sm)
```

### Hover & Focus States

**Accessibility requirements**:

- Minimum contrast ratio: 4.5:1 for text, 3:1 for UI components
- Focus indicators: 2px outline at `--node-prompt` or `--node-image` depending on context
- Hover states must be visually distinct without relying solely on color

**Patterns**:

```css
/* Buttons */
.button:hover {
  background: var(--surface-elevated)
  border-color: var(--border-strong)
}

.button:focus-visible {
  outline: 2px solid var(--node-prompt)
  outline-offset: 2px
}

/* Inputs */
.input:focus {
  border-color: var(--node-prompt)
  background: var(--background)
}

/* Interactive nodes */
.node:hover {
  border-color: var(--border-strong)
}

.node:focus-within {
  /* No change - focus goes to internal elements */
}
```

## Implementation Plan

### Phase 1: Foundation & Tokens (Priority)

#### 1.1 Create Design Tokens

**File**: `app/globals.css:6-43` (replace `:root` block)

**Before**:

```css
--primary: linear-gradient(135deg, #ff0080, #ff8c00, #40e0d0, #9370db, #ff1493);
--primary-solid: #ff0080;
--secondary: #ec4899;
--accent: #40e0d0;
```

**After**:

```css
/* Monochrome foundation */
--background: #0a0a0a;
--surface: #141414;
--surface-elevated: #1a1a1a;
--border: #262626;
--border-strong: #404040;

--text-primary: #ffffff;
--text-secondary: #a3a3a3;
--text-muted: #737373;

/* Node type accents (ONLY colors) */
--node-prompt: #3b82f6;
--node-image: #8b5cf6;

/* Functional colors */
--status-error: #ef4444;
--status-success: #10b981;
--status-running: #f59e0b;

/* Typography */
--font-size-lg: 14px;
--font-size-base: 13px;
--font-size-sm: 11px;

/* Border radius */
--radius-none: 0px;
--radius-sm: 4px;
--radius-md: 6px;
--radius-full: 9999px;
```

Tasks:

- [ ] Replace rainbow gradient variables with monochrome palette
- [ ] Add node type accent colors (blue, purple)
- [ ] Add functional status colors
- [ ] Define explicit typography scale (14px, 13px, 11px)
- [ ] Define border-radius tokens (keep existing 0.375rem as --radius-md)
- [ ] Remove rainbow utility classes (lines 133-151)
- [ ] Update scrollbar colors to use --border instead of pink (lines 166, 178, 184)

#### 1.2 Update Tailwind Config

**File**: `tailwind.config.ts` (if exists, or inline in CSS)

Tasks:

- [ ] Map design tokens to Tailwind theme
- [ ] Ensure consistent color scales
- [ ] Remove legacy theme colors
- [ ] Test dark mode utilities work with new palette

### Phase 2: Core Components (High Impact)

#### 2.1 Node Components

**File**: `components/node-components.tsx`

**NodeContainer (lines 18-65)**:

**Before**:

```tsx
<Card className={`border ${
  isRunning
    ? "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.35)]"
    : "border-border/50 hover:border-primary"
} bg-card/90`}>
```

**After**:

```tsx
<Card className={`border ${
  isRunning
    ? "border-[var(--status-running)] shadow-[0_0_8px_rgba(245,158,11,0.15)]"  // Subtle pulse
    : isSelected
      ? "border-2 rounded-md border-[var(--node-prompt)] shadow-[0_0_0_1px_rgba(59,130,246,0.2)]"  // Selected: rounded + glow
      : "border border-[var(--border)] hover:border-[var(--border-strong)] rounded-none"  // Default: sharp
} bg-[var(--surface)]`}>
```

**NodeHeader Settings Icon (lines 82-92)**:

**Before**:

```tsx
<Button variant="ghost" className="h-6 w-6 p-0">
  <Settings2 className="w-3 h-3" />
</Button>
```

**After**:

```tsx
<Button variant="ghost" className="h-6 w-6 p-0 opacity-40 hover:opacity-100 transition-opacity">
  <Settings2 className="w-3 h-3 text-muted-foreground" />
</Button>
```

**File**: `components/nodes/prompt-node.tsx`

**Node header gradient (line 38)**:

**Before**:

```tsx
icon={<MessageSquare className="w-3 h-3 text-blue-500" />}
```

**After**:

```tsx
icon={<MessageSquare className="w-3 h-3" style={{ color: 'var(--node-prompt)' }} />}
```

**Textarea (line 44-55)**:

**Before**:

```tsx
<Textarea className="nodrag min-h-[120px] text-sm bg-input border-border/50 p-2" />
```

**After**:

```tsx
<Textarea className="nodrag min-h-[120px] text-[13px] font-medium bg-[var(--surface-elevated)] border border-[var(--border)] focus:border-[var(--node-prompt)] rounded p-2" />
```

**File**: `components/nodes/image-node.tsx`

**Remove rounded borders from images (lines 338-343, 352-358)**:

**Before**:

```tsx
<div className="relative overflow-hidden rounded border">
  <img className="block w-full h-full object-cover rounded" />
</div>
```

**After**:

```tsx
<div className="relative overflow-hidden rounded-none border">
  <img className="block w-full h-full object-cover rounded-none" />
</div>
```

**Selected image border (line 340-342)**:

**Before**:

```tsx
className={`... ${
  selectedImageId === item.id ? "border-primary" : "border-border"
}`}
```

**After**:

```tsx
className={`... ${
  selectedImageId === item.id
    ? "border-2 border-[var(--node-image)] rounded-none"
    : "border border-[var(--border)] rounded-none"
}`}
```

**Connection handles (lines 27-33, 246-256)**:

**Before**:

```tsx
className: "w-4 h-4 bg-primary border-2 border-background"
style: {
  background: "#ff0080"
}
```

**After**:

```tsx
className: "w-4 h-4 border-2 border-background"
style: {
  background: "var(--node-prompt)"
} // or --node-image
```

Tasks:

- [ ] Update `NodeContainer` to use sharp corners by default, rounded when selected
- [ ] Replace yellow running glow with subtle orange pulse
- [ ] Add opacity-40 to settings icon (Tier 4 prominence)
- [ ] Replace hardcoded icon colors with CSS variables
- [ ] Add header gradient backgrounds (8% opacity)
- [ ] Remove all `rounded` classes from image elements
- [ ] Update selected image borders to use node-type color
- [ ] Replace hardcoded handle colors with CSS variables
- [ ] Update textarea to use medium font weight (Tier 1 content)

#### 2.2 Header Components

**File**: `app/page.tsx` (header section, estimate lines 150-250)

**Run Button (Tier 2 - PRIMARY)**:

**Before**:

```tsx
<Button onClick={handleRun} className="gap-1.5">
  <Play className="w-3.5 h-3.5" />
  Run
  {queueCount > 0 && <Badge>{queueCount}</Badge>}
</Button>
```

**After**:

```tsx
<Button
  onClick={handleRun}
  className="gap-1.5 bg-white text-black font-semibold hover:bg-white/90 rounded"
>
  <Play className="w-3.5 h-3.5" />
  Run
  {queueCount > 0 && (
    <Badge className="bg-[var(--surface-elevated)] text-white border-none">{queueCount}</Badge>
  )}
</Button>
```

**Secondary Buttons (Tier 3)**:

**Before**:

```tsx
<Button variant="outline">Add Node</Button>
```

**After**:

```tsx
<Button
  variant="outline"
  className="bg-transparent border border-[var(--border)] hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)] font-normal rounded"
>
  Add Node
</Button>
```

**Tertiary/Ghost Buttons (Tier 4)**:

**Before**:

```tsx
<Button variant="ghost">Settings</Button>
```

**After**:

```tsx
<Button
  variant="ghost"
  className="bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] rounded-none border-none"
>
  Settings
</Button>
```

**Workflow Switcher Text (Tier 1 - user content)**:

```tsx
// In WorkflowSwitcher component
<span className="font-medium text-[var(--text-primary)]">{workflowName}</span>
```

Tasks:

- [ ] Update Run button to white bg, black text, semibold (Tier 2)
- [ ] Update queue badge to monochrome styling
- [ ] Update secondary buttons to bordered style (Tier 3)
- [ ] Update ghost buttons to no-border, no-radius (Tier 4)
- [ ] Ensure workflow name uses font-medium (Tier 1)
- [ ] Test all hover states for sufficient contrast

#### 2.3 Canvas

**Files**: `components/node-graph-canvas.tsx`, `components/flow-canvas.tsx`

**Canvas Background**:

**Before**:

```tsx
<ReactFlow className="bg-background">  // Already black (#0a0a0f)
```

**After**:

```tsx
<ReactFlow className="bg-[var(--background)]">  // Pure black (#0a0a0a)
```

**Edge Styles** (ReactFlow configuration):

**Before**:

```tsx
// Current default edges (likely using default ReactFlow styling)
```

**After**:

```tsx
const defaultEdgeOptions = {
  style: {
    stroke: "var(--border-strong)",
    strokeWidth: 1.5,
  },
  type: "default", // bezier
}

// For edges connected to specific node types (dynamic):
const getEdgeStyle = (sourceNode: any, targetNode: any) => {
  if (sourceNode.type === "prompt" || targetNode.type === "prompt") {
    return {
      stroke: "color-mix(in srgb, var(--node-prompt) 40%, var(--border-strong))",
      strokeWidth: 1.5,
    }
  }
  if (sourceNode.type === "image-gen" || targetNode.type === "image-gen") {
    return {
      stroke: "color-mix(in srgb, var(--node-image) 40%, var(--border-strong))",
      strokeWidth: 1.5,
    }
  }
  return { stroke: "var(--border-strong)", strokeWidth: 1.5 }
}
```

**Connection Handles Hover** (already in node files):

```css
/* In globals.css, add handle hover state */
.react-flow__handle:hover {
  background: var(--node-prompt) !important;
  transform: scale(1.2);
  transition: all 0.2s;
}
```

Tasks:

- [ ] Ensure canvas uses pure black background
- [ ] Update default edge stroke to `--border-strong`
- [ ] Add edge color mixing based on connected node types
- [ ] Add handle hover states to globals.css
- [ ] Test edge visibility against black background
- [ ] Verify connection affordances are clear

### Phase 3: Panels & Overlays (Medium Impact)

#### 3.1 Inspector Panel

**Files**: `components/node-inspector-panel.tsx`, `components/node-inspector-sections/*`

Tasks:

- [ ] Panel background: `--surface` (not elevated)
- [ ] Section headers: small, uppercase, muted (Tier 5)
- [ ] Content labels: secondary color, normal weight (Tier 5)
- [ ] User content (prompts, values): primary color, medium weight (Tier 1)
- [ ] Remove excessive spacing/padding
- [ ] Test readability and hierarchy

#### 3.2 Media Manager

**File**: `components/media-manager.tsx`

**Background** (estimate line 200+):

**Before**:

```tsx
<div className="bg-background">  // Already black
```

**After**:

```tsx
<div className="bg-[var(--background)]">  // Ensure pure black
```

**Image Thumbnails** (estimate lines 250-350):

**Before**:

```tsx
<img
  className="rounded object-cover border border-border"
  onClick={() => setSelectedAssetId(asset.id)}
/>
```

**After**:

```tsx
<img
  className="rounded-none object-cover border ${
    selectedAssetId === asset.id 
      ? 'border-2 border-[var(--node-image)] shadow-[0_0_0_1px_rgba(139,92,246,0.2)]'
      : 'border border-[var(--border)] hover:border-[var(--border-strong)]'
  }"
  onClick={() => setSelectedAssetId(asset.id)}
/>
```

**Selection Mode Buttons**:

**Before**:

```tsx
{
  selectionMode && (
    <>
      <Button onClick={() => onUseAsset?.(selectedAssetId)}>Use Selected</Button>
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
    </>
  )
}
```

**After**:

```tsx
{
  selectionMode && (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
      <Button
        onClick={() => onUseAsset?.(selectedAssetId)}
        className="bg-white text-black font-semibold hover:bg-white/90 rounded px-8 h-12"
        disabled={!selectedAssetId}
      >
        Use Selected
      </Button>
      <Button
        variant="outline"
        onClick={onClose}
        className="bg-transparent border border-[var(--border)] hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)] font-normal rounded px-6 h-12"
      >
        Cancel
      </Button>
    </div>
  )
}
```

**Delete Button** (hover-revealed):

**Before**:

```tsx
<Button variant="ghost" size="sm" onClick={handleDelete}>
  <Trash2 />
</Button>
```

**After**:

```tsx
<Button
  variant="ghost"
  size="sm"
  className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-destructive"
  onClick={handleDelete}
>
  <Trash2 className="w-4 h-4" />
</Button>
```

Tasks:

- [ ] Ensure background is pure black
- [ ] Remove all `rounded` classes from image thumbnails (use `rounded-none`)
- [ ] Update selected image border to 2px node-image color with glow
- [ ] Make "Use Selected" button white, semibold, larger (Tier 2 PRIMARY)
- [ ] Make "Cancel" button bordered secondary style (Tier 3)
- [ ] Add opacity-0 to delete buttons, reveal on hover (Tier 4)
- [ ] Test grid layout and focus states

#### 3.3 Dialogs & Popovers

**Files**: `components/ui/dialog.tsx`, `components/ui/popover.tsx`, `components/workflow-*.tsx`

Tasks:

- [ ] Dialog overlays: dark background with subtle blur
- [ ] Dialog content: `--surface-elevated`, `--radius-md`
- [ ] Primary actions in dialogs: white button (Tier 2)
- [ ] Secondary actions: ghost or bordered (Tier 3)
- [ ] Test focus trapping and keyboard nav
- [ ] Ensure escape hatches are visible

### Phase 4: Inputs & Controls (Detail Pass)

#### 4.1 Form Inputs

**Files**: `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/select.tsx`

Tasks:

- [ ] Input backgrounds: `--surface-elevated`
- [ ] Input borders: `--border` default, `--node-prompt` on focus
- [ ] Input text: `--text-primary`, medium weight for user content
- [ ] Placeholder text: `--text-muted`
- [ ] Border radius: `--radius-sm` (4px)
- [ ] Test focus states and contrast

#### 4.2 Buttons

**Files**: `components/ui/button.tsx`

Tasks:

- [ ] Create clear variant hierarchy:
  - `default` (Tier 2): white bg, black text, semibold, rounded
  - `secondary` (Tier 3): transparent, border, normal weight, rounded
  - `ghost` (Tier 4): transparent, no border, no radius, muted text
- [ ] Remove other variants (outline, destructive, etc.) or map to these 3
- [ ] Ensure hover states have sufficient contrast
- [ ] Test button groups and disabled states

#### 4.3 Status & Badges

**Files**: `components/ui/badge.tsx`, node status indicators

Tasks:

- [ ] Remove colorful badges for non-critical states
- [ ] Error badges: `--status-error` (functional color)
- [ ] Success badges: minimal use, `--status-success`
- [ ] Running status: subtle pulse with `--status-running`
- [ ] Queue count badge: white text on `--surface-elevated`, not accent color
- [ ] Test badge sizes (prefer `--font-size-sm`)

### Phase 5: Polish & Accessibility (Final Pass)

#### 5.1 Contrast Audit

Tasks:

- [ ] Run automated contrast checker on all text/background combinations
- [ ] Fix any failures (minimum 4.5:1 for text, 3:1 for UI)
- [ ] Test with browser zoom at 200%
- [ ] Test with Windows High Contrast mode
- [ ] Verify focus indicators are visible in all contexts

#### 5.2 Typography Audit

Tasks:

- [ ] Ensure only 3 font sizes are used (lg, base, sm)
- [ ] Verify weight hierarchy: semibold only for primary actions
- [ ] Check line-height for readability (1.5 for body text)
- [ ] Remove any orphaned font-size utilities
- [ ] Test text wrapping and truncation

#### 5.3 Border Radius Audit

Tasks:

- [ ] Verify NO rounded borders on images (0px)
- [ ] Verify nodes use 0px default, 6px when selected
- [ ] Verify buttons use 4px (primary/secondary only)
- [ ] Verify inputs use 4px
- [ ] Remove any other border-radius usages

#### 5.4 Color Audit

Tasks:

- [ ] Verify ONLY node-type colors are used for accents
- [ ] Verify functional colors (error/success) are only for status
- [ ] Check that no random accent colors remain (green, yellow, red, etc.)
- [ ] Ensure all UI chrome is monochrome (black/white/grey)
- [ ] Test with color blindness simulators

## User Stories

### US1: Focus on Content, Not Chrome

**As a user**, when I look at my workflow, **the prompts and images are the most prominent elements**, and the UI chrome fades into the background.

**Technical**:

- Prompt text: `--font-weight-medium`, `--text-primary` (Tier 1)
- Images: full corners visible (0px radius), high contrast borders (Tier 1)
- Settings icons: `--text-muted`, 40% opacity (Tier 4)
- Panel backgrounds: `--surface`, minimal contrast (Tier 5)

**Acceptance**:

- [ ] Settings icon is barely visible until hover
- [ ] Prompt text is visually heavier than all labels
- [ ] Generated images have no cropped corners
- [ ] Panel backgrounds don't compete with canvas

### US2: Clear Visual Hierarchy for Actions

**As a user**, when I need to run my workflow, **the Run button is immediately obvious**, while secondary actions are discoverable but not distracting.

**Technical**:

- Run button: white bg, semibold weight (Tier 2)
- Add node button: bordered, normal weight (Tier 3)
- Canvas controls: ghost style (Tier 4)

**Acceptance**:

- [ ] Run button is the most prominent interactive element
- [ ] Secondary buttons are visible but don't compete
- [ ] Ghost buttons are discoverable on hover/focus

### US3: Studio Environment Aesthetic

**As a user**, when I work in atelier, **it feels like a professional art studio**—calm, minimal, and focused on my creations.

**Technical**:

- Monochrome palette: blacks, greys, white
- Only colors: node type accents (blue, purple)
- Reduced visual noise: no unnecessary borders, shadows, or accents

**Acceptance**:

- [ ] App feels cohesive and calm
- [ ] No random color accents distract from work
- [ ] Dark background creates "studio" ambiance
- [ ] User creations (prompts, images) stand out naturally

### US4: Accessibility Without Sacrifice

**As a user with visual needs**, **all interactive elements have clear hover/focus states** that meet accessibility standards, without adding visual clutter.

**Technical**:

- 4.5:1 contrast for all text
- 3:1 contrast for UI components
- 2px focus outlines with node-type colors
- Hover states use background elevation, not just color

**Acceptance**:

- [ ] All text passes WCAG AA contrast
- [ ] Focus indicators are visible on all interactive elements
- [ ] Hover states are distinguishable without relying on color alone
- [ ] High contrast mode is usable

### US5: Selected State Clarity

**As a user**, when I select a node or image, **the selection is immediately obvious** through color and shape changes.

**Technical**:

- Selected node: 2px node-type border, 6px radius (vs 0px default)
- Selected image: 2px node-type border, 0px radius (unchanged)
- Subtle glow with node-type color at 20% opacity

**Acceptance**:

- [ ] Selected nodes visibly "activate" with color and rounded corners
- [ ] Selected images have clear colored border
- [ ] Multiple selections are visually consistent
- [ ] Deselection is equally clear

### US6: Image Integrity

**As a user**, when I view generated images, **I see the complete artwork** without cropped corners or hidden edges.

**Technical**:

- All image displays: `border-radius: 0px`
- Includes: node result images, history thumbnails, lightbox, media manager
- Exception: none (even selected images keep 0px radius)

**Acceptance**:

- [ ] No image corners are cropped by border-radius
- [ ] Image thumbnails show full artwork
- [ ] Lightbox displays complete image
- [ ] Media manager grid shows full images

## Acceptance Criteria

### Phase 1: Foundation

- [ ] Design tokens defined in `app/globals.css`
- [ ] Monochrome palette: black, white, 3 grey shades for UI
- [ ] Node type accents: blue (prompt), purple (image)
- [ ] Typography: 3 sizes only (14px, 13px, 11px)
- [ ] Border radius: 4 tokens (0px, 4px, 6px, 9999px)
- [ ] Old theme colors removed

### Phase 2: Core Components

- [ ] Nodes: sharp corners default, rounded when selected
- [ ] Nodes: settings icon is Tier 4 (muted, low opacity)
- [ ] Nodes: prompt text is Tier 1 (medium weight, primary color)
- [ ] Images: 0px border-radius everywhere
- [ ] Header: Run button is Tier 2 (white, semibold)
- [ ] Header: other buttons are Tier 3 or 4 (ghost/bordered)
- [ ] Canvas: black background, subtle edges

### Phase 3: Panels

- [ ] Inspector: receded styling (Tier 5 chrome)
- [ ] Inspector: user content is Tier 1
- [ ] Media Manager: 0px radius on all images
- [ ] Media Manager: "Use Selected" is Tier 2 (white button)
- [ ] Dialogs: elevated surface, clear actions

### Phase 4: Inputs & Controls

- [ ] Inputs: 4px radius, node-type color focus
- [ ] Buttons: 3 clear variants (default, secondary, ghost)
- [ ] Badges: minimal use, only functional colors
- [ ] Status indicators: subtle, not distracting

### Phase 5: Polish

- [ ] All text meets 4.5:1 contrast ratio
- [ ] All UI meets 3:1 contrast ratio
- [ ] Focus indicators visible on all interactive elements
- [ ] Only node-type colors used for accents
- [ ] No random colors in UI chrome
- [ ] Typography audit: only 3 sizes in use
- [ ] Border radius audit: images all 0px, nodes contextual

## Architecture Assessment

### ✅ What Works With Current Codebase

1. **Component structure is compatible** - `NodeContainer`, `NodeHeader`, `NodeContent` support all proposed changes
2. **CSS variable system exists** - Already using CSS variables, just need to swap values
3. **Conditional styling supported** - `isRunning` and `isSelected` props already available
4. **Typography close to target** - `text-xs` (12px) and `text-sm` (14px) map to my 3-tier system
5. **Border radius token exists** - `--radius: 0.375rem` perfect for `--radius-md`

### 📝 What Needs Adjustment

1. **No node-type-aware styling** - Need to pass node type to `NodeContainer` for dynamic colors
2. **Hardcoded handle colors** - Currently use inline `style` props, need CSS variables
3. **No header gradient support** - Need to add gradient background to `NodeHeader`
4. **Image borders all rounded** - Need systematic find/replace for `rounded` → `rounded-none`
5. **Button variants** - 6 variants exist, need to consolidate to 3 tiers

### 🔧 Key Structural Changes Required

**1. Pass Node Type to Container** (for dynamic accent colors):

```tsx
// In prompt-node.tsx and image-node.tsx
<NodeContainer
  nodeType="prompt"  // NEW PROP
  isRunning={isRunning}
  isSelected={selected}
>
```

**2. Update NodeContainer to Accept Node Type**:

```tsx
interface NodeContainerProps {
  nodeType?: "prompt" | "image-gen"  // NEW
  isRunning?: boolean
  isSelected?: boolean
  children: ReactNode
  handles?: { ... }
}
```

**3. Dynamic Border Color Based on Node Type**:

```tsx
const accentColor = nodeType === "prompt" ? "var(--node-prompt)" : "var(--node-image)"
const borderClass = isSelected
  ? `border-2 rounded-md shadow-[0_0_0_1px_rgba(${
      nodeType === "prompt" ? "59,130,246" : "139,92,246"
    },0.2)]`
  : "border border-[var(--border)] rounded-none"
```

## Migration Strategy

### Step 1: CSS Variables Foundation (1-2 hours)

**File**: `app/globals.css`

**Actions**:

1. Replace lines 7-43 (`:root` block) with new monochrome palette
2. Add node-type accent variables (`--node-prompt`, `--node-image`)
3. Add typography size variables (`--font-size-lg/base/sm`)
4. Add border-radius variables (`--radius-none/sm/md/full`)
5. Remove rainbow utility classes (lines 133-151)
6. Update scrollbar colors to use `--border` instead of pink

**Commit**: `feat: add minimal design system tokens`

**Test**: Verify app still loads, expect visual changes

### Step 2: Node Components (2-3 hours)

**Order of operations** (minimize breaking changes):

1. **`components/node-components.tsx`** (~30 min):

   - Add `nodeType` prop to `NodeContainer`
   - Update border logic for sharp/rounded based on selection
   - Add opacity-40 to settings icon
   - Update background colors to use new variables

2. **`components/nodes/prompt-node.tsx`** (~20 min):

   - Pass `nodeType="prompt"` to `NodeContainer`
   - Update icon color to use `var(--node-prompt)`
   - Update textarea classes (font-medium, new variables)
   - Update handle colors to use `var(--node-prompt)`

3. **`components/nodes/image-node.tsx`** (~1 hour):
   - Pass `nodeType="image-gen"` to `NodeContainer`
   - Replace ALL `rounded` with `rounded-none` on images (lines 338-610)
   - Update selected image border to use `var(--node-image)`
   - Update handle colors to use `var(--node-image)`
   - Update thumbnail grid borders

**Commit**: `feat: apply minimal design to node components`

**Test**: Create prompt and image nodes, verify sharp corners, selection states, image displays

### Step 3: Header & Buttons (1 hour)

**Files**: `app/page.tsx`, `components/ui/button.tsx`

**Actions**:

1. Update Run button to white bg, black text, semibold
2. Update queue badge to monochrome styling
3. Update secondary buttons to bordered style
4. Update ghost buttons to no-border, no-radius
5. Ensure workflow name uses font-medium

**Commit**: `feat: apply minimal design to header and buttons`

**Test**: Click through all header actions, verify visual hierarchy

### Step 4: Media Manager (1 hour)

**File**: `components/media-manager.tsx`

**Actions**:

1. Find/replace `rounded` → `rounded-none` on all images
2. Update selected image border to use `var(--node-image)`
3. Update "Use Selected" button to white, semibold, larger
4. Update "Cancel" button to bordered secondary style
5. Add opacity-0 to delete buttons (hover reveal)

**Commit**: `feat: apply minimal design to media manager`

**Test**: Open media manager, select images, verify no cropped corners

### Step 5: Canvas & Edges (30 min)

**Files**: `components/node-graph-canvas.tsx`, `app/globals.css`

**Actions**:

1. Update edge default stroke to `var(--border-strong)`
2. Add handle hover states to globals.css
3. Verify canvas background is pure black

**Commit**: `feat: apply minimal design to canvas`

**Test**: Connect nodes, hover handles, verify edge visibility

### Step 6: Polish & Audit (2-3 hours)

**Actions**:

1. Run contrast checker on all text/background combos
2. Verify only 3 font sizes used (grep for `text-`)
3. Verify images all have `rounded-none` (grep for `<img.*rounded[^-]`)
4. Verify no hardcoded colors remain (grep for `#[0-9a-f]{6}`)
5. Test with keyboard navigation and screen reader
6. Update `docs/conventions.md` with new design rules

**Commit**: `docs: update conventions with minimal design system`

**Total Estimated Time**: 8-12 hours

### Rollback Strategy

Each commit is independently revertable:

- Tokens change? Revert Step 1
- Nodes broken? Revert Step 2
- Header issues? Revert Step 3

All changes are CSS/class-based, no logic changes.

## Success Metrics

### Before (Current Design Issues)

- ❌ 10+ colors used throughout UI (random accents)
- ❌ Settings icons as prominent as content
- ❌ Images cropped by border-radius (lost corners)
- ❌ Unclear visual hierarchy (everything equally loud)
- ❌ Contrast failures on hover states
- ❌ 5+ font sizes mixed inconsistently

### After (Minimal Studio Design)

- ✅ 2 accent colors only (node types: blue, purple)
- ✅ 3 font sizes consistently applied
- ✅ Images show full artwork (0px radius)
- ✅ Clear 5-tier visual hierarchy
- ✅ All interactions meet WCAG AA (4.5:1 text, 3:1 UI)
- ✅ Settings icons nearly invisible until hover (Tier 4)
- ✅ Run button immediately obvious (Tier 2, white)
- ✅ Studio environment aesthetic (calm, professional, minimal)

### User Feedback Targets

- "The UI gets out of the way and lets me focus on my work"
- "I can immediately tell what's important"
- "It feels like a professional creative tool"
- "I can see my entire generated image"

## Related Documents

- `docs/conventions.md` - UI/UX conventions (to be updated with design system)
- Design tokens live in `app/globals.css`
- Tailwind theme in `tailwind.config.ts` (or inline CSS variables)

## Design Decisions

### Decision 1: Monochrome Foundation with Node-Type Accents

**Rationale**: atelier is a creative studio environment. The user's work (prompts, images) should be the visual focus, not the UI. Monochrome palette creates a neutral canvas, while node-type colors provide just enough wayfinding without distraction.

**Trade-off**: Less "colorful" than typical dashboards, but aligns with professional creative tools (Figma, Blender, Photoshop all use dark, minimal UIs).

### Decision 2: Remove Rounded Borders from Images

**Rationale**: Generated artwork should be displayed in full, without cropping corners. Users need to see complete output to evaluate quality.

**Trade-off**: Less visually "soft," but functional correctness wins. Rounded corners on images are decorative, not functional.

### Decision 3: Five-Tier Visual Hierarchy

**Rationale**: Clear hierarchy ensures users can quickly scan for important elements. Content > Actions > Chrome is a time-tested pattern for creative tools.

**Trade-off**: Requires disciplined application across components. Easier to maintain with clear tier definitions.

### Decision 4: Sparingly Use Rounded Borders for Emphasis

**Rationale**: If everything is rounded, nothing stands out. Use sharp corners as default, rounded corners signal "active" or "important" state.

**Trade-off**: Deviates from current design, but creates more intentional UI.

### Decision 5: Settings Icons as Low-Prominence (Tier 4)

**Rationale**: Settings are secondary actions. Current design makes them as prominent as the content itself, violating hierarchy.

**Trade-off**: Slightly less discoverable, but appears on hover. Trade-off favors reduced visual noise.

### Decision 6: Three Font Sizes Maximum

**Rationale**: Typographic hierarchy requires restraint. Too many sizes creates visual chaos. Three sizes (with weight variations) provides sufficient range.

**Trade-off**: Less granular control, but enforces consistency and professionalism.

## Open Questions

1. **Should we support a light theme variant?**

   - Dark theme is primary, but some users prefer light
   - Would require all tokens to have light equivalents
   - **Decision**: Ship dark theme first, add light mode in future story if requested

2. **Should node-type colors be user-customizable?**

   - Could allow users to pick accent colors
   - Adds complexity to theme system
   - **Decision**: Hardcode for now, revisit if users request it

3. **Should we add density settings (compact/spacious)?**

   - Professional tools often offer this (VS Code, Figma)
   - Requires careful spacing token system
   - **Decision**: Not in this story, keep in mind for future

4. **Should functional colors (error/success) be monochrome too?**

   - Ultra-minimal approach would use only text for status
   - Colors aid quick scanning for errors
   - **Decision**: Keep red for errors, green for success (functional, not decorative)

5. **What about edge colors in the canvas?**
   - Should they be fully monochrome or show node-type color?
   - Color helps trace connections
   - **Decision**: Mix node-type color at 40% opacity with base edge color

## Implementation Notes

- This is a design refresh, not a rewrite
- Existing components stay, only styling changes
- Can ship incrementally (component by component)
- Each phase is independently testable
- Total effort: ~2-3 days for core changes, +1 day for polish

## Visual Reference

**Inspiration** (studio/professional tool aesthetics):

- Figma: dark UI, minimal chrome, content-focused
- Blender: black canvas, muted panels, tool actions clear
- Photoshop: dark workspace, artboards stand out
- VS Code: monochrome with syntax highlighting as only color

**Key Principle**: The UI is the stage, the user's work is the performance.
