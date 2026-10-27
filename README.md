# DN2 Tools

Browser tools for the Digitone II mod (sample machines, recorder, Machinedrum PERC).

**Open it:** https://de-pattern.github.io/dn2mk2/

## DN2 Sample Import

Send WAV files to the Digitone II's sampler mod over USB, from Chrome or Edge (Web MIDI).

- Connect the Digitone II by USB, with **USB CONFIG** set to USB MIDI or Overbridge.
  Close Elektron Transfer first.
- Pick the Digitone II's MIDI ports and click **Connect**. The tool shows what is on the
  instrument now and how much room there is.
- Drop or browse WAVs, or whole folders: each sample keeps its folder's name, and the
  instrument's sample browser (FUNC + YES in the sample list, firmware v0.25 or later)
  shows them by folder. Names can be up to 35 characters.
- Choose how they go in:
  - **Replace all, in list order**: your samples become SAMP 1, 2, 3... (recordings stay);
  - **Replace all, choose each slot**;
  - **Add**: only the new samples are sent, into the slots you choose; what is already
    there stays (needs one Replace all from this browser first).
- **Send.** The samples go to the +Drive and load at every power-on.

**Install it as an app:** in Chrome, open the page and choose **Install DN2 Import**
(the icon in the address bar, or the menu). It gets its own window and desktop icon.

## DN2 Mod Patcher

https://de-pattern.github.io/dn2mk2/patcher.html

Builds the mod firmware (`DN2mod_vX.Y_NAME_OS1.11.syx`) in the browser, from your own
copies of three free Elektron downloads:

- **Digitone II OS 1.11** (.syx or Elektron's .zip): the file that gets patched;
- **Digitakt II OS 1.17** (or 1.16): its DSP's sample-reading tables;
- **Machinedrum UW OS 1.63** (.syx or .bin): its machines' tables, for PERC.

The build is the project's own Python, run with Pyodide in a worker (a few minutes). The
page lets you save the result **only if its sha256 is exactly the build the project's
ship gate cleared** for that version (`patcher/builds.json`). Nothing is uploaded.

Flash it by dragging it onto Elektron Transfer with the Digitone II connected by USB,
after backing up. The stock OS 1.11 file puts it back.

Nothing here is Elektron's: no firmware, no tables; the patcher reads those from your files. The tool talks to the mod's own SysEx
commands (manufacturer ID 00 20 3C, device 7D).
