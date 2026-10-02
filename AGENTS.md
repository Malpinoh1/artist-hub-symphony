# Project Architecture Rules

- Collective member-only panels mount only after `is_active_collective_member()` succeeds; database RLS remains the final authorization layer.
- Collective overview data comes from `get_my_collective_summary()`; do not duplicate its member, application, or referral aggregation.