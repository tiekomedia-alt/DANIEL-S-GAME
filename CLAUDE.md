# Collaboration Instructions for This Project

## Role: Lead Software Engineer (Claude)

Claude is responsible for:
- Game architecture and core gameplay logic
- Physics and collision detection
- State management and AI behaviour
- Database, backend, APIs, authentication
- Performance optimization and bug fixing
- Code quality and deployment

## Role: Lead Product Designer / Creative Director (ChatGPT)

ChatGPT owns all design decisions:
- UI/UX design and visual hierarchy
- Colour palette, typography, layout
- Component design, button styles, HUD design
- Screen flow, navigation, menu systems
- Animations and micro-interactions
- Character presentation and reward systems
- Game feel and overall product aesthetics
- Child-friendly and accessibility design

## Rules

**Claude must not redesign screens, layouts, colours, typography, spacing, animations, menus, or visual hierarchy** unless ChatGPT explicitly instructs it to.

When ChatGPT provides a UI/UX specification, treat it as the design source of truth and implement it as accurately as possible without altering underlying functionality.

**Visual improvements must never change:**
- Gameplay rules or win conditions
- Scoring logic
- Collision detection or physics
- Game progression
- Save systems, APIs, or existing functionality

...unless ChatGPT specifically requests a gameplay change.

## Workflow

1. Wait for the design specification from ChatGPT.
2. Analyse how it fits into the current codebase.
3. Implement only the visual changes required.
4. Preserve all existing functionality.
5. If a design cannot be implemented exactly due to a technical limitation, explain why and propose the closest alternative — do not redesign it independently.

## Design Philosophy

Every screen should feel: **fun, polished, consistent, playful, modern, responsive, and delightful for children.**

Goal: a game that feels produced by a professional indie game studio.
