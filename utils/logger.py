"""
Logger horodaté par spoke.
Format : [2026-03-16 14:32:01] [SCRAPER] Message
"""
import logging
import sys


def get_logger(spoke_name: str) -> logging.Logger:
    """Retourne un logger configuré pour un spoke donné."""
    logger = logging.getLogger(spoke_name)

    if logger.handlers:
        return logger  # déjà configuré

    logger.setLevel(logging.DEBUG)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG)

    formatter = logging.Formatter(
        fmt="%(asctime)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.propagate = False

    return logger


def log_spoke_start(logger: logging.Logger, competitor: str) -> None:
    logger.info(f"Démarrage — analyse de '{competitor}'")


def log_spoke_end(logger: logging.Logger, input_tokens: int, output_tokens: int, elapsed: float) -> None:
    logger.info(
        f"Terminé — {elapsed:.1f}s | tokens in={input_tokens} out={output_tokens}"
    )


def log_spoke_error(logger: logging.Logger, error: Exception) -> None:
    logger.error(f"Échec — {type(error).__name__}: {error}")
