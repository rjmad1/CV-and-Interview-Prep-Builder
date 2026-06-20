from typing import Any

class AwaitableWrapper:

    def __init__(self, value):
        self.value = value

    def __await__(self):
        if False:
            yield
        return self.value

class AsyncSessionShim:
    """
    Shims a synchronous SQLAlchemy Session to act like an AsyncSession.
    All methods (execute, commit, rollback, refresh) are synchronous under the hood
    but return an AwaitableWrapper so they can be awaited by async routes.
    """
    def __init__(self, sync_session):
        self.sync_session = sync_session

    def execute(self, statement, *args, **kwargs):
        res = self.sync_session.execute(statement, *args, **kwargs)
        return AwaitableWrapper(res)

    def commit(self):
        self.sync_session.commit()
        return AwaitableWrapper(None)

    def rollback(self):
        self.sync_session.rollback()
        return AwaitableWrapper(None)

    def refresh(self, instance, *args, **kwargs):
        self.sync_session.refresh(instance, *args, **kwargs)
        return AwaitableWrapper(None)

    def add(self, instance):
        return self.sync_session.add(instance)

    def delete(self, instance):
        self.sync_session.delete(instance)
        return AwaitableWrapper(None)

    def flush(self):
        self.sync_session.flush()
        return AwaitableWrapper(None)

    def __getattr__(self, name: str) -> Any:
        return getattr(self.sync_session, name)

