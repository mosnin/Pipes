/*
 * One radius for everything you can press or type into.
 *
 * The installed components each shipped their own corner, from a 6.4px
 * rectangle to a full capsule, so a screen built from a dozen of them read as
 * a dozen kits. `--radius-control` in `globals.css` sets the shape for every
 * control that takes it from a class. These constants are for the few that
 * animate their corners inline, where a class cannot reach.
 */

/** Buttons, inputs, filters, tabs, panels that morph out of a control. */
export const CONTROL_RADIUS = 10;

/** A control nested inside another, so the curves sit concentric. */
export const CONTROL_RADIUS_INNER = 6;
