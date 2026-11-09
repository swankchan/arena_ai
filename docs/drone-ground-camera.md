# Drone height and follow camera

The drone chase/action camera now follows vertical motion in the entity frame without smoothing away its climb or descent; orbit, turn and speed offsets still ease as before. Other modes retain their existing vertical smoothing.

Hong Kong supplies a dedicated floor query from the local DTM/water, nearby selected road surface and authored major-park ground. Drone movement samples the path at up to 2 m spacing, samples the rotor footprint at its destination and keeps the body origin at least 0.25 m above the highest sample; teleport/restore uses the footprint before collider clearance checks. Floor samples deliberately do not constitute a continuous swept-volume test, a guarantee against thin terrain features or a complete roof/bridge collision system. Buildings continue to use existing colliders. The 1000 m maximum remains, except where enforcing the ground minimum would require greater altitude. The use of up to seven or more ground queries per update may need profiling on the full map.

Unit tests exercise hills, fast forward movement, footprint, restore and chase/action vertical tracking. Full-game Hong Kong WebGPU, low-flying and camera behaviour have not yet been visually verified.
