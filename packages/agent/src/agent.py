from .orchestrator import create_video_orchestrator


def create_video_agent():
    """Create the video agent. Delegates to orchestrator."""
    return create_video_orchestrator()
