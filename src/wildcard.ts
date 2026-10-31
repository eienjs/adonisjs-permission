export class WildcardPermission {
  public static readonly PART_DELIMITER = '.';

  public static readonly SUBPART_DELIMITER = ',';

  public static readonly WILDCARD_TOKEN = '*';

  public static implies(assigned: string, required: string): boolean {
    if (assigned === required || assigned === this.WILDCARD_TOKEN) {
      return true;
    }

    const assignedParts = assigned.split(this.PART_DELIMITER);
    const requiredParts = required.split(this.PART_DELIMITER);

    for (let i = 0; i < assignedParts.length; i++) {
      const assignedPart = assignedParts[i];

      // If the assigned part is a wildcard, and it's the last part of assigned,
      // it matches all remaining required parts
      if (assignedPart === this.WILDCARD_TOKEN && i === assignedParts.length - 1) {
        return true;
      }

      // If required has no part at this level, assigned is more specific than required
      if (i >= requiredParts.length) {
        return false;
      }

      if (assignedPart === this.WILDCARD_TOKEN) {
        continue;
      }

      const assignedSubparts = new Set(assignedPart.split(this.SUBPART_DELIMITER).map((s) => s.trim()));
      if (assignedSubparts.has(this.WILDCARD_TOKEN)) {
        continue;
      }

      const requiredPart = requiredParts[i];
      const requiredSubparts = requiredPart.split(this.SUBPART_DELIMITER).map((s) => s.trim());

      // Every required subpart must be in the assigned subparts
      const hasAllSubparts = requiredSubparts.every((sub) => assignedSubparts.has(sub));
      if (!hasAllSubparts) {
        return false;
      }
    }

    // If assigned has fewer parts than required and all assigned parts matched,
    // Spatie treats it as matching all subsequent subparts (e.g., 'posts' implies 'posts.create')
    if (assignedParts.length < requiredParts.length) {
      return true;
    }

    return true;
  }
}
